// src/quiz/student-quiz.service.spec.ts
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { QuizAccess } from './quiz-access';
import { QuizAttemptService } from './quiz-attempt.service';
import { StudentQuizService } from './student-quiz.service';

const student = { id: 'st1', schoolId: 'sc1' };
const now = new Date('2026-10-09T03:10:00Z');
const question = {
  id: 'q1', order: 0, type: 'SINGLE', prompt: 'P', imageUrl: null, points: 1, assignmentId: 'a1',
  options: [
    { id: 'a', text: 'A', imageUrl: null, isCorrect: true },
    { id: 'b', text: 'B', imageUrl: null, isCorrect: false },
  ],
  blanks: [],
};
const assignment = (overrides = {}) => ({
  id: 'a1', title: 'Quiz', description: null, dueDate: null, maxScore: 1, allowStudentViewScore: true,
  quizSettings: { timeLimitMinutes: 20 }, subjectId: 's1', ...overrides,
});
const soa = (attempt: any) => ({ id: 'soa1', assignmentId: 'a1', subjectId: 's1', schoolId: 'sc1', studentId: 'st1', score: null, quizAttempt: attempt });
const live = { startedAt: new Date('2026-10-09T03:00:00Z'), deadlineAt: new Date('2026-10-09T03:20:00Z'), submittedAt: null, lastSeenAt: now, shuffleSeed: 3 };

describe('StudentQuizService', () => {
  let service: StudentQuizService;
  const prisma = {
    assignmentOnQuiz: { findMany: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
    studentOnQuiz: { findMany: jest.fn(), upsert: jest.fn() },
    studentOnAssignment: { updateMany: jest.fn(), update: jest.fn() },
  };
  const access = { studentQuiz: jest.fn() };
  const attempts = { finalizeAttempt: jest.fn() };
  const cache = { bump: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([question]);
    prisma.studentOnQuiz.findMany.mockResolvedValue([]);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        StudentQuizService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuizAccess, useValue: access },
        { provide: QuizAttemptService, useValue: attempts },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();
    service = moduleRef.get(StudentQuizService);
  });
  afterEach(() => jest.useRealTimers());

  it('hides questions before start and never leaks the key while answering', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(null), assignment: assignment() });
    const before = await service.getQuiz('soa1', student);
    expect(before.questions).toEqual([]);
    expect(before.questionCount).toBe(1);

    access.studentQuiz.mockResolvedValue({ soa: soa(live), assignment: assignment() });
    const during = await service.getQuiz('soa1', student);
    expect(during.questions).toHaveLength(1);
    expect(JSON.stringify(during)).not.toMatch(/isCorrect|acceptedAnswers|correctOptionIds/);
  });

  it('start sets the attempt once (guarded) with a deadline from the time limit', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(null), assignment: assignment() });
    prisma.assignmentOnQuiz.count.mockResolvedValue(1);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 1 });
    await service.start('soa1', student);
    const call = prisma.studentOnAssignment.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'soa1', quizAttempt: { isSet: false } });
    expect(call.data.quizAttempt.set).toMatchObject({ startedAt: now, deadlineAt: new Date('2026-10-09T03:30:00Z'), lastSeenAt: now });
    expect(cache.bump).toHaveBeenCalled();
  });

  it('start ignores a due date that has already passed (late start allowed)', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(null), assignment: assignment({ dueDate: new Date('2026-10-08T00:00:00Z') }) });
    prisma.assignmentOnQuiz.count.mockResolvedValue(1);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 1 });
    await service.start('soa1', student);
    expect(prisma.studentOnAssignment.updateMany.mock.calls[0][0].data.quizAttempt.set.deadlineAt).toEqual(new Date('2026-10-09T03:30:00Z'));
  });

  it('start refuses an empty quiz', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(null), assignment: assignment() });
    prisma.assignmentOnQuiz.count.mockResolvedValue(0);
    await expect(service.start('soa1', student)).rejects.toThrow(BadRequestException);
  });

  it('saveAnswer: 409 QUIZ_NOT_STARTED after a teacher reset', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(null), assignment: assignment() });
    await expect(service.saveAnswer('soa1', 'q1', { selectedOptionIds: ['a'], blankAnswers: [] }, student)).rejects.toThrow('QUIZ_NOT_STARTED');
  });

  it('saveAnswer: finalizes and 409 QUIZ_CLOSED past deadline + grace', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa({ ...live, deadlineAt: new Date('2026-10-09T03:09:00Z') }), assignment: assignment() });
    await expect(service.saveAnswer('soa1', 'q1', { selectedOptionIds: ['a'], blankAnswers: [] }, student)).rejects.toThrow(ConflictException);
    expect(attempts.finalizeAttempt).toHaveBeenCalledWith('soa1');
  });

  it('saveAnswer upserts one answer and bumps nothing', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(live), assignment: assignment() });
    prisma.assignmentOnQuiz.findUnique.mockResolvedValue(question);
    prisma.studentOnQuiz.upsert.mockResolvedValue({ updateAt: now });
    await expect(service.saveAnswer('soa1', 'q1', { selectedOptionIds: ['b'], blankAnswers: [] }, student)).resolves.toEqual({ questionId: 'q1', savedAt: now });
    expect(prisma.studentOnQuiz.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentOnAssignmentId_assignmentOnQuizId: { studentOnAssignmentId: 'soa1', assignmentOnQuizId: 'q1' } },
        update: { selectedOptionIds: ['b'], blankAnswers: { set: [] } },
      }),
    );
    expect(cache.bump).not.toHaveBeenCalled();
  });

  it('saveAnswer: 409 QUIZ_NOT_STARTED when a reset lands after the access check', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(live), assignment: assignment() });
    prisma.assignmentOnQuiz.findUnique.mockResolvedValue(question);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.saveAnswer('soa1', 'q1', { selectedOptionIds: ['a'], blankAnswers: [] }, student)).rejects.toThrow('QUIZ_NOT_STARTED');
    expect(prisma.studentOnQuiz.upsert).not.toHaveBeenCalled();
  });

  it('saveAnswer rejects a bad shape with 400', async () => {
    access.studentQuiz.mockResolvedValue({ soa: soa(live), assignment: assignment() });
    prisma.assignmentOnQuiz.findUnique.mockResolvedValue(question);
    await expect(service.saveAnswer('soa1', 'q1', { selectedOptionIds: ['a', 'b'], blankAnswers: [] }, student)).rejects.toThrow(BadRequestException);
  });

  it('result includes the key only when showAnswersAfterSubmit is on', async () => {
    const submitted = { ...live, submittedAt: now };
    prisma.studentOnQuiz.findMany.mockResolvedValue([{ assignmentOnQuizId: 'q1', selectedOptionIds: ['a'], blankAnswers: [], score: 1 }]);
    access.studentQuiz.mockResolvedValue({ soa: { ...soa(submitted), score: 1 }, assignment: assignment() });
    expect((await service.getQuiz('soa1', student)).result).toEqual({ score: 1, maxScore: 1, questions: null });
    access.studentQuiz.mockResolvedValue({ soa: { ...soa(submitted), score: 1 }, assignment: assignment({ quizSettings: { showAnswersAfterSubmit: true } }) });
    const view = await service.getQuiz('soa1', student);
    expect(view.result?.questions?.[0]).toMatchObject({ id: 'q1', correctOptionIds: ['a'], score: 1 });
    expect(view.questions).toEqual([]);
  });
});
