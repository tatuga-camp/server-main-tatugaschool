// src/quiz/quiz-monitor.service.spec.ts
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { emptySummary } from '../quiz-integrity/integrity-summary';
import { QuizAccess } from './quiz-access';
import { QuizAttemptService } from './quiz-attempt.service';
import { QuizMonitorService } from './quiz-monitor.service';

const user = { id: 'u1' } as any;
const now = new Date('2026-10-09T03:10:00Z');
const quiz = { id: 'a1', subjectId: 's1', maxScore: 3, quizSettings: { testMode: true } };
const person = { studentId: 'st', title: 'Mr', firstName: 'A', lastName: 'B', number: '1', photo: 'p', blurHash: null, score: null };
const attempt = (o = {}) => ({
  startedAt: new Date('2026-10-09T03:00:00Z'), deadlineAt: null, submittedAt: null,
  lastSeenAt: new Date('2026-10-09T03:09:55Z'), shuffleSeed: 1, integritySummary: emptySummary(),
  riskScore: 5, riskSource: 'RULE', riskPattern: null, riskConfidence: null, ...o,
});

describe('QuizMonitorService', () => {
  let service: QuizMonitorService;
  const prisma = {
    studentOnAssignment: { findMany: jest.fn(), update: jest.fn() },
    assignmentOnQuiz: { count: jest.fn(), findMany: jest.fn() },
    studentOnQuiz: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), deleteMany: jest.fn() },
    quizIntegrityEvent: { findMany: jest.fn(), deleteMany: jest.fn() },
  };
  const access = { teacherAssignment: jest.fn(), teacherStudentOnAssignment: jest.fn() };
  const attempts = { finalizeAttempt: jest.fn() };
  const cache = { bump: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    access.teacherAssignment.mockResolvedValue(quiz);
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizMonitorService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuizAccess, useValue: access },
        { provide: QuizAttemptService, useValue: attempts },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(QuizMonitorService);
  });
  afterEach(() => jest.useRealTimers());

  it('builds rows with status, answered count and risk; finalizes expired attempts', async () => {
    const expired = { id: 'soa3', ...person, quizAttempt: attempt({ deadlineAt: new Date('2026-10-09T03:00:00Z') }) };
    prisma.studentOnAssignment.findMany.mockResolvedValue([
      { id: 'soa1', ...person, quizAttempt: null },
      { id: 'soa2', ...person, quizAttempt: attempt() },
      expired,
    ]);
    attempts.finalizeAttempt.mockResolvedValue({ ...expired, quizAttempt: attempt({ submittedAt: now }), score: 2 });
    prisma.assignmentOnQuiz.count.mockResolvedValue(3);
    prisma.studentOnQuiz.findMany.mockResolvedValue([
      { studentOnAssignmentId: 'soa2', selectedOptionIds: ['a'], blankAnswers: [] },
      { studentOnAssignmentId: 'soa2', selectedOptionIds: [], blankAnswers: [] }, // auto-filled blank row
    ]);
    prisma.quizIntegrityEvent.findMany.mockResolvedValue([{ studentOnAssignmentId: 'soa2', type: 'HIDDEN' }]);

    const view = await service.getMonitor('a1', user);
    expect(attempts.finalizeAttempt).toHaveBeenCalledWith('soa3');
    expect(view.rows.map((r) => [r.studentOnAssignmentId, r.status, r.answeredCount])).toEqual([
      ['soa1', 'NOT_STARTED', 0],
      ['soa2', 'AWAY', 1],
      ['soa3', 'SUBMITTED', 0],
    ]);
    expect(view.rows[1]).toMatchObject({ riskScore: 5, riskSource: 'RULE', questionCount: 3 });
  });

  it('override caps at question points, re-sums the total and bumps', async () => {
    prisma.studentOnQuiz.findUnique.mockResolvedValue({ id: 'ans1', studentOnAssignmentId: 'soa1', assignmentOnQuiz: { points: 2 } });
    access.teacherStudentOnAssignment.mockResolvedValue({ soa: { id: 'soa1', subjectId: 's1' }, assignment: quiz });
    await expect(service.overrideScore('ans1', { score: 3 }, user)).rejects.toThrow(BadRequestException);

    prisma.studentOnQuiz.findMany.mockResolvedValue([{ score: 1.5 }, { score: null }, { score: 1 }]);
    prisma.studentOnAssignment.update.mockResolvedValue({ score: 2.5 });
    await expect(service.overrideScore('ans1', { score: 1.5 }, user)).resolves.toEqual({ studentOnQuizId: 'ans1', score: 1.5, total: 2.5 });
    expect(prisma.studentOnQuiz.update).toHaveBeenCalledWith({ where: { id: 'ans1' }, data: { score: 1.5, teacherOverridden: true } });
    expect(prisma.studentOnAssignment.update).toHaveBeenCalledWith({ where: { id: 'soa1' }, data: { score: 2.5 } });
    expect(cache.bump).toHaveBeenCalledWith('subject:s1:submissions', 'subject:s1:grades');
  });

  it('reset clears answers, events and the attempt', async () => {
    access.teacherStudentOnAssignment.mockResolvedValue({ soa: { id: 'soa1', subjectId: 's1' }, assignment: quiz });
    await service.reset('soa1', user);
    expect(prisma.studentOnQuiz.deleteMany).toHaveBeenCalledWith({ where: { studentOnAssignmentId: 'soa1' } });
    expect(prisma.quizIntegrityEvent.deleteMany).toHaveBeenCalledWith({ where: { studentOnAssignmentId: 'soa1' } });
    expect(prisma.studentOnAssignment.update).toHaveBeenCalledWith({
      where: { id: 'soa1' },
      data: { quizAttempt: { unset: true }, status: 'PENDDING', score: null, completedAt: null },
    });
    expect(cache.bump).toHaveBeenCalled();
  });
});
