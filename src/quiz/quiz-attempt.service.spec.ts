// src/quiz/quiz-attempt.service.spec.ts
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { QuizIntegrityService } from '../quiz-integrity/quiz-integrity.service';
import { QuizAttemptService } from './quiz-attempt.service';

const q = (id: string, correct: string, points = 1) => ({
  id,
  type: 'SINGLE',
  points,
  options: [
    { id: 'a', text: 'A', imageUrl: null, isCorrect: correct === 'a' },
    { id: 'b', text: 'B', imageUrl: null, isCorrect: correct === 'b' },
  ],
  blanks: [],
});
const baseSoa = (attempt: any, testMode = false) => ({
  id: 'soa1',
  assignmentId: 'a1',
  studentId: 'st1',
  subjectId: 's1',
  schoolId: 'sc1',
  quizAttempt: attempt,
  assignment: { id: 'a1', quizSettings: { scoringMode: 'ALL_OR_NOTHING', testMode } },
});

describe('QuizAttemptService.finalizeAttempt', () => {
  let service: QuizAttemptService;
  const prisma = {
    studentOnAssignment: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn() },
    assignmentOnQuiz: { findMany: jest.fn() },
    studentOnQuiz: { findMany: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  };
  const cache = { bump: jest.fn() };
  const integrity = { evaluateWithJev: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    integrity.evaluateWithJev.mockResolvedValue(undefined);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 1 });
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizAttemptService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: QuizIntegrityService, useValue: integrity },
      ],
    }).compile();
    service = moduleRef.get(QuizAttemptService);
  });

  it('returns the stored row without regrading when already submitted', async () => {
    prisma.studentOnAssignment.findUnique.mockResolvedValue(baseSoa({ submittedAt: new Date() }));
    await service.finalizeAttempt('soa1');
    expect(prisma.assignmentOnQuiz.findMany).not.toHaveBeenCalled();
    expect(prisma.studentOnAssignment.updateMany).not.toHaveBeenCalled();
  });

  it('throws QUIZ_NOT_STARTED when a teacher reset races the submit', async () => {
    prisma.studentOnAssignment.findUnique.mockResolvedValue(baseSoa({ submittedAt: null, startedAt: new Date() }));
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([]);
    prisma.studentOnQuiz.findMany.mockResolvedValue([]);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.finalizeAttempt('soa1')).rejects.toThrow('QUIZ_NOT_STARTED');
    expect(cache.bump).not.toHaveBeenCalled();
  });

  it('grades answers, keeps teacher overrides, fills unanswered with 0 and submits', async () => {
    prisma.studentOnAssignment.findUnique.mockResolvedValue(baseSoa({ submittedAt: null, startedAt: new Date() }, true));
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([q('q1', 'a', 2), q('q2', 'b', 3), q('q3', 'a', 5)]);
    prisma.studentOnQuiz.findMany.mockResolvedValue([
      { id: 'ans1', assignmentOnQuizId: 'q1', selectedOptionIds: ['a'], blankAnswers: [], teacherOverridden: false, score: null },
      { id: 'ans2', assignmentOnQuizId: 'q2', selectedOptionIds: ['a'], blankAnswers: [], teacherOverridden: true, score: 1.5 },
    ]);
    prisma.studentOnAssignment.findUniqueOrThrow.mockResolvedValue({ id: 'soa1', score: 3.5 });

    await expect(service.finalizeAttempt('soa1')).resolves.toEqual({ id: 'soa1', score: 3.5 });

    expect(prisma.studentOnQuiz.update).toHaveBeenCalledWith({ where: { id: 'ans1' }, data: { score: 2 } });
    expect(prisma.studentOnQuiz.update).toHaveBeenCalledTimes(1); // override untouched
    expect(prisma.studentOnQuiz.upsert).toHaveBeenCalledWith({
      where: { studentOnAssignmentId_assignmentOnQuizId: { studentOnAssignmentId: 'soa1', assignmentOnQuizId: 'q3' } },
      create: expect.objectContaining({ score: 0, selectedOptionIds: [], blankAnswers: [] }),
      update: {},
    });
    const update = prisma.studentOnAssignment.updateMany.mock.calls[0][0];
    expect(update.where).toEqual({
      id: 'soa1',
      AND: [{ quizAttempt: { isSet: true } }, { quizAttempt: { is: { submittedAt: null } } }],
    });
    expect(update.data).toMatchObject({
      score: 3.5,
      status: 'REVIEWD',
      quizAttempt: { upsert: { update: { submittedAt: expect.any(Date) } } },
    });
    expect(cache.bump).toHaveBeenCalledWith('subject:s1:submissions', 'subject:s1:grades');
    expect(integrity.evaluateWithJev).toHaveBeenCalledWith('soa1');
  });

  it('treats a P2002 on the missing-answer upsert as success (concurrent finalize created the row)', async () => {
    prisma.studentOnAssignment.findUnique.mockResolvedValue(baseSoa({ submittedAt: null, startedAt: new Date() }));
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([q('q1', 'a', 2)]);
    prisma.studentOnQuiz.findMany.mockResolvedValue([]);
    prisma.studentOnQuiz.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }),
    );
    prisma.studentOnAssignment.findUniqueOrThrow.mockResolvedValue({ id: 'soa1', score: 0 });
    await expect(service.finalizeAttempt('soa1')).resolves.toEqual({ id: 'soa1', score: 0 });
    expect(prisma.studentOnAssignment.updateMany).toHaveBeenCalledTimes(1);
  });

  it('rethrows other upsert errors', async () => {
    prisma.studentOnAssignment.findUnique.mockResolvedValue(baseSoa({ submittedAt: null, startedAt: new Date() }));
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([q('q1', 'a', 2)]);
    prisma.studentOnQuiz.findMany.mockResolvedValue([]);
    prisma.studentOnQuiz.upsert.mockRejectedValue(new Error('boom'));
    await expect(service.finalizeAttempt('soa1')).rejects.toThrow('boom');
  });

  it('returns the winner without bumping or re-running Jev when a concurrent finalize submitted first', async () => {
    const winner = { ...baseSoa({ submittedAt: new Date(), startedAt: new Date() }, true), score: 2 };
    prisma.studentOnAssignment.findUnique
      .mockResolvedValueOnce(baseSoa({ submittedAt: null, startedAt: new Date() }, true))
      .mockResolvedValueOnce(winner);
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([]);
    prisma.studentOnQuiz.findMany.mockResolvedValue([]);
    prisma.studentOnAssignment.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.finalizeAttempt('soa1')).resolves.toBe(winner);
    expect(cache.bump).not.toHaveBeenCalled();
    expect(integrity.evaluateWithJev).not.toHaveBeenCalled();
  });
});
