// src/quiz-integrity/quiz-integrity.service.spec.ts
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { QuizAccess } from '../quiz/quiz-access';
import { emptySummary } from './integrity-summary';
import { JevClient } from './jev.client';
import { QuizIntegrityService } from './quiz-integrity.service';

const student = { id: 'st1', schoolId: 'sc1' };
const now = new Date('2026-10-09T03:10:00Z');
const attempt = (overrides = {}) => ({
  startedAt: new Date('2026-10-09T03:00:00Z'),
  deadlineAt: null,
  submittedAt: null,
  lastSeenAt: new Date('2026-10-09T03:09:50Z'),
  shuffleSeed: 1,
  integritySummary: emptySummary(),
  riskScore: 0,
  riskSource: 'RULE',
  riskPattern: null,
  riskConfidence: null,
  riskCheckedAt: null,
  riskInputHash: null,
  ...overrides,
});
const soa = (a: any) => ({ id: 'soa1', assignmentId: 'a1', subjectId: 's1', schoolId: 'sc1', studentId: 'st1', quizAttempt: a });
const quiz = (testMode: boolean) => ({ id: 'a1', type: 'Quiz', quizSettings: { testMode } });

describe('QuizIntegrityService.ingest', () => {
  let service: QuizIntegrityService;
  const prisma = {
    quizIntegrityEvent: { createMany: jest.fn(), findMany: jest.fn() },
    studentOnAssignment: { updateMany: jest.fn(), findUnique: jest.fn() },
    assignmentOnQuiz: { count: jest.fn() },
    studentOnQuiz: { count: jest.fn() },
  };
  const access = { studentQuiz: jest.fn() };
  const jev = { isEnabled: jest.fn(), evaluate: jest.fn() };
  const attemptPatch = (call = 0) => prisma.studentOnAssignment.updateMany.mock.calls[call][0];

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    jev.isEnabled.mockReturnValue(false);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizIntegrityService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuizAccess, useValue: access },
        { provide: JevClient, useValue: jev },
      ],
    }).compile();
    service = moduleRef.get(QuizIntegrityService);
  });
  afterEach(() => jest.useRealTimers());

  it('ignores batches when test mode is off or the attempt is submitted', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(attempt()), assignment: quiz(false) });
    await service.ingest('soa1', student, { events: [{ type: 'HIDDEN', clientAt: now.toISOString() }] });
    access.studentQuiz.mockResolvedValue({ soa: soa(attempt({ submittedAt: now })), assignment: quiz(true) });
    await service.ingest('soa1', student, { events: [{ type: 'HIDDEN', clientAt: now.toISOString() }] });
    expect(prisma.quizIntegrityEvent.createMany).not.toHaveBeenCalled();
  });

  it('stores events, recomputes the summary and writes the rule score', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(attempt()), assignment: quiz(true) });
    prisma.quizIntegrityEvent.findMany.mockResolvedValue([
      { type: 'HIDDEN', durationMs: null },
      { type: 'VISIBLE', durationMs: 40_000 },
    ]);
    await service.ingest('soa1', student, {
      events: [
        { type: 'HIDDEN', clientAt: '2026-10-09T03:09:15Z' },
        { type: 'VISIBLE', clientAt: '2026-10-09T03:09:55Z', durationMs: 40_000 },
      ],
      heartbeat: true,
    });
    expect(prisma.quizIntegrityEvent.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ type: 'HIDDEN', durationMs: null, serverAt: now, studentOnAssignmentId: 'soa1', assignmentId: 'a1' }),
        expect.objectContaining({ type: 'VISIBLE', durationMs: 40_000 }),
      ],
    });
    const update = attemptPatch();
    expect(update.where).toEqual({ id: 'soa1', quizAttempt: { isSet: true } });
    expect(update.data.quizAttempt.upsert.update).toMatchObject({
      lastSeenAt: now,
      integritySummary: { set: expect.objectContaining({ exitCount: 1, totalAwayMs: 40_000, longestAwayMs: 40_000 }) },
      riskScore: 25, // min(30, 40/4=10) + 15 for longest > 30 s
      riskSource: 'RULE',
    });
  });

  it('records a HEARTBEAT_GAP when a beat arrives > 25 s late with no return event', async () => {
    access.studentQuiz.mockResolvedValue({
      soa: soa(attempt({ lastSeenAt: new Date('2026-10-09T03:09:20Z') })),
      assignment: quiz(true),
    });
    prisma.quizIntegrityEvent.findMany.mockResolvedValue([{ type: 'HEARTBEAT_GAP', durationMs: 40_000 }]);
    await service.ingest('soa1', student, { events: [], heartbeat: true });
    expect(prisma.quizIntegrityEvent.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ type: 'HEARTBEAT_GAP', durationMs: 40_000 })],
    });
  });

  it('only touches lastSeenAt when nothing changed', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(attempt()), assignment: quiz(true) });
    prisma.quizIntegrityEvent.findMany.mockResolvedValue([]);
    await service.ingest('soa1', student, { events: [], heartbeat: true });
    expect(prisma.quizIntegrityEvent.createMany).not.toHaveBeenCalled();
    expect(attemptPatch().data.quizAttempt.upsert.update).toEqual({ lastSeenAt: now });
  });

  it('evaluateWithJev writes the Jev verdict when the summary is unchanged', async () => {
    jev.isEnabled.mockReturnValue(true);
    const summary = { ...emptySummary(), exitCount: 2, totalAwayMs: 20_000, longestAwayMs: 15_000 };
    const row = { ...soa(attempt({ integritySummary: summary })), assignment: quiz(true) };
    prisma.studentOnAssignment.findUnique.mockResolvedValueOnce(row).mockResolvedValueOnce({ quizAttempt: row.quizAttempt });
    prisma.assignmentOnQuiz.count.mockResolvedValue(10);
    prisma.studentOnQuiz.count.mockResolvedValue(4);
    jev.evaluate.mockResolvedValue({ riskScore: 62, pattern: 'OUTSIDE_HELP', confidence: 0.8 });
    await service.evaluateWithJev('soa1');
    expect(jev.evaluate).toHaveBeenCalledWith(expect.objectContaining({ questionCount: 10, answeredCount: 4, elapsedMs: 600_000 }));
    expect(attemptPatch().data.quizAttempt.upsert.update).toMatchObject({
      riskScore: 62,
      riskSource: 'JEV',
      riskPattern: 'OUTSIDE_HELP',
      riskConfidence: 0.8,
      riskCheckedAt: now,
    });
  });

  it('evaluateWithJev skips clean attempts and never throws', async () => {
    jev.isEnabled.mockReturnValue(true);
    prisma.studentOnAssignment.findUnique.mockResolvedValueOnce({ ...soa(attempt()), assignment: quiz(true) });
    await expect(service.evaluateWithJev('soa1')).resolves.toBeUndefined();
    expect(jev.evaluate).not.toHaveBeenCalled();
    prisma.studentOnAssignment.findUnique.mockRejectedValueOnce(new Error('db down'));
    await expect(service.evaluateWithJev('soa1')).resolves.toBeUndefined();
  });
});
