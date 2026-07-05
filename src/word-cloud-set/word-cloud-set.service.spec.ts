import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WordCloudSetService } from './word-cloud-set.service';

describe('WordCloudSetService', () => {
  let service: WordCloudSetService;
  const mockValidateAccess = jest.fn();
  const mockPrisma: any = {
    subject: { findUnique: jest.fn() },
    studentOnSubject: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordCloudSetService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: TeacherOnSubjectService,
          useValue: { ValidateAccess: mockValidateAccess },
        },
      ],
    }).compile();

    service = module.get<WordCloudSetService>(WordCloudSetService);

    (service as any).repository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findManyQuestions: jest.fn(),
      findUniqueQuestion: jest.fn(),
      createQuestion: jest.fn(),
      updateQuestion: jest.fn(),
      updateManyQuestions: jest.fn(),
      countAnswers: jest.fn(),
      findManyAnswers: jest.fn(),
      deleteSet: jest.fn(),
      deleteQuestion: jest.fn(),
    };
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a set, one question per string with incrementing order, and points active at the first', async () => {
      mockPrisma.subject.findUnique.mockResolvedValue({
        id: 'sub1',
        schoolId: 'school1',
      });
      const repo = (service as any).repository;
      repo.create.mockResolvedValue({ id: 'set1' });
      repo.createQuestion
        .mockResolvedValueOnce({ id: 'q0', order: 0 })
        .mockResolvedValueOnce({ id: 'q1', order: 1 });
      repo.update.mockResolvedValue({ id: 'set1', activeWordCloudId: 'q0' });

      const result = await service.create(
        { subjectId: 'sub1', questions: ['A?', 'B?'] },
        { id: 'user1' } as any,
      );

      expect(mockValidateAccess).toHaveBeenCalledWith({
        userId: 'user1',
        subjectId: 'sub1',
      });
      expect(repo.createQuestion).toHaveBeenCalledTimes(2);
      expect(repo.createQuestion.mock.calls[0][0].data.order).toBe(0);
      expect(repo.createQuestion.mock.calls[1][0].data.order).toBe(1);
      expect(repo.update).toHaveBeenCalledWith({
        where: { id: 'set1' },
        data: { activeWordCloudId: 'q0' },
      });
      expect(result.activeWordCloudId).toBe('q0');
    });

    it('persists the title on the set when provided', async () => {
      mockPrisma.subject.findUnique.mockResolvedValue({
        id: 'sub1',
        schoolId: 'school1',
      });
      const repo = (service as any).repository;
      repo.create.mockResolvedValue({ id: 'set1' });
      repo.createQuestion.mockResolvedValueOnce({ id: 'q0', order: 0 });
      repo.update.mockResolvedValue({ id: 'set1', activeWordCloudId: 'q0' });

      await service.create(
        { subjectId: 'sub1', questions: ['A?'], title: 'Week 3 warm-up' },
        { id: 'user1' } as any,
      );

      expect(repo.create.mock.calls[0][0].data.title).toBe('Week 3 warm-up');
    });
  });

  describe('update — close cascades to questions', () => {
    it('sets every child question to CLOSED when the set is closed', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockResolvedValue({ id: 'set1', status: 'CLOSED' });

      await service.update(
        { setId: 'set1', status: 'CLOSED' },
        { id: 'user1' } as any,
      );

      expect(repo.updateManyQuestions).toHaveBeenCalledWith({
        where: { wordCloudSetId: 'set1' },
        data: { status: 'CLOSED' },
      });
    });

    it('does NOT touch question status when only advancing the pointer', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockResolvedValue({ id: 'set1' });

      await service.update(
        { setId: 'set1', activeWordCloudId: 'q2' },
        { id: 'user1' } as any,
      );

      expect(repo.updateManyQuestions).not.toHaveBeenCalled();
      expect(repo.update).toHaveBeenCalledWith({
        where: { id: 'set1' },
        data: { activeWordCloudId: 'q2' },
      });
    });
  });

  describe('update — title vs allowMultiple cascade', () => {
    it('writes the title to the set only and does NOT cascade it to questions', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockResolvedValue({ id: 'set1', title: 'Renamed' });

      await service.update(
        { setId: 'set1', title: 'Renamed' },
        { id: 'user1' } as any,
      );

      expect(repo.update).toHaveBeenCalledWith({
        where: { id: 'set1' },
        data: { title: 'Renamed' },
      });
      expect(repo.updateManyQuestions).not.toHaveBeenCalled();
    });

    it('cascades allowMultiple to child questions', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockResolvedValue({ id: 'set1', allowMultiple: true });

      await service.update(
        { setId: 'set1', allowMultiple: true },
        { id: 'user1' } as any,
      );

      expect(repo.updateManyQuestions).toHaveBeenCalledWith({
        where: { wordCloudSetId: 'set1' },
        data: { allowMultiple: true },
      });
    });
  });

  describe('appendQuestion', () => {
    it('adds a question at max(order)+1', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({
        id: 'set1',
        subjectId: 'sub1',
        schoolId: 'school1',
        userId: 'user1',
        accessMode: 'PUBLIC',
      });
      repo.findManyQuestions.mockResolvedValue([
        { id: 'q0', order: 0 },
        { id: 'q1', order: 1 },
      ]);
      repo.createQuestion.mockResolvedValue({ id: 'q2', order: 2 });

      await service.appendQuestion(
        { setId: 'set1' },
        { question: 'C?' },
        { id: 'user1' } as any,
      );

      expect(repo.createQuestion.mock.calls[0][0].data.order).toBe(2);
    });
  });

  describe('deleteQuestion', () => {
    it('rejects deleting a question that already has answers', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.findUniqueQuestion.mockResolvedValue({
        id: 'q0',
        wordCloudSetId: 'set1',
      });
      repo.countAnswers.mockResolvedValue(3);

      await expect(
        service.deleteQuestion(
          { setId: 'set1', wordCloudId: 'q0' },
          { id: 'user1' } as any,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.deleteQuestion).not.toHaveBeenCalled();
    });
  });

  describe('getPublic — reveal filtering', () => {
    it('returns only questions with order <= the active question order', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({
        id: 'set1',
        status: 'OPEN',
        accessMode: 'PUBLIC',
        allowMultiple: false,
        subjectId: 'sub1',
        activeWordCloudId: 'q1',
      });
      repo.findManyQuestions.mockResolvedValue([
        { id: 'q0', question: 'A?', order: 0, status: 'OPEN' },
        { id: 'q1', question: 'B?', order: 1, status: 'OPEN' },
        { id: 'q2', question: 'C?', order: 2, status: 'OPEN' },
      ]);

      const result = await service.getPublic({ setId: 'set1' });

      expect(result.questions.map((q) => q.id)).toEqual(['q0', 'q1']);
      expect(result.activeWordCloudId).toBe('q1');
    });

    it('throws when the set does not exist', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue(null);
      await expect(service.getPublic({ setId: 'nope' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('shareResults / revokeResults', () => {
    it('generates a 32-char hex token after validating teacher access', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockImplementation(async (args: any) => ({
        id: 'set1',
        ...args.data,
      }));

      const result = await service.shareResults(
        { setId: 'set1' },
        { id: 'user1' } as any,
      );

      expect(mockValidateAccess).toHaveBeenCalledWith({
        userId: 'user1',
        subjectId: 'sub1',
      });
      expect(result.publicResultsToken).toMatch(/^[a-f0-9]{32}$/);
    });

    it('rotates to a different token when shared again', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockImplementation(async (args: any) => ({
        id: 'set1',
        ...args.data,
      }));

      await service.shareResults({ setId: 'set1' }, { id: 'user1' } as any);
      await service.shareResults({ setId: 'set1' }, { id: 'user1' } as any);

      const first = repo.update.mock.calls[0][0].data.publicResultsToken;
      const second = repo.update.mock.calls[1][0].data.publicResultsToken;
      expect(first).toMatch(/^[a-f0-9]{32}$/);
      expect(second).toMatch(/^[a-f0-9]{32}$/);
      expect(second).not.toBe(first);
    });

    it('revoke sets the token to null', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockResolvedValue({ id: 'set1', publicResultsToken: null });

      await service.revokeResults({ setId: 'set1' }, { id: 'user1' } as any);

      expect(repo.update).toHaveBeenCalledWith({
        where: { id: 'set1' },
        data: { publicResultsToken: null },
      });
    });
  });

  describe('getResultsByToken', () => {
    const token = 'a'.repeat(32);

    it('returns ALL questions with aggregated words and no internal ids', async () => {
      const repo = (service as any).repository;
      repo.findFirst.mockResolvedValue({
        id: 'set1',
        title: 'My set',
        status: 'OPEN',
        activeWordCloudId: 'q0', // active is the FIRST question…
        subjectId: 'sub1',
        schoolId: 'school1',
        userId: 'user1',
      });
      repo.findManyQuestions.mockResolvedValue([
        { id: 'q0', question: 'A?', order: 0, status: 'OPEN', accessMode: 'PUBLIC' },
        { id: 'q1', question: 'B?', order: 1, status: 'OPEN', accessMode: 'PUBLIC' },
      ]);
      repo.findManyAnswers
        .mockResolvedValueOnce([
          { text: 'Dog', normalized: 'dog' },
          { text: 'dog', normalized: 'dog' },
          { text: 'Cat', normalized: 'cat' },
        ])
        .mockResolvedValueOnce([]);

      const result = await service.getResultsByToken({ token });

      // …yet BOTH questions are returned: no reveal filtering on results.
      expect(result.questions).toHaveLength(2);
      expect(repo.findFirst).toHaveBeenCalledWith({
        where: { publicResultsToken: token },
      });
      expect(result.title).toBe('My set');
      expect(result.questions[0].words[0]).toMatchObject({
        normalized: 'dog',
        count: 2,
      });
      expect(result.questions[0].totalAnswers).toBe(3);
      expect(result).not.toHaveProperty('subjectId');
      expect(result).not.toHaveProperty('schoolId');
      expect(result).not.toHaveProperty('userId');
      expect(result.questions[0]).not.toHaveProperty('subjectId');
    });

    it('includes answerer names for STUDENTS_ONLY questions', async () => {
      const repo = (service as any).repository;
      repo.findFirst.mockResolvedValue({
        id: 'set1',
        title: null,
        status: 'OPEN',
        activeWordCloudId: 'q0',
      });
      repo.findManyQuestions.mockResolvedValue([
        {
          id: 'q0',
          question: 'A?',
          order: 0,
          status: 'OPEN',
          accessMode: 'STUDENTS_ONLY',
        },
      ]);
      repo.findManyAnswers.mockResolvedValueOnce([
        { text: 'Dog', normalized: 'dog', studentOnSubjectId: 'sos1' },
      ]);
      mockPrisma.studentOnSubject.findMany.mockResolvedValue([
        { id: 'sos1', firstName: 'Ann', lastName: 'B' },
      ]);

      const result = await service.getResultsByToken({ token });

      expect(result.questions[0].words[0].students).toEqual(['Ann B']);
    });

    it('throws NotFound for an unknown or revoked token', async () => {
      const repo = (service as any).repository;
      repo.findFirst.mockResolvedValue(null);

      await expect(
        service.getResultsByToken({ token }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
