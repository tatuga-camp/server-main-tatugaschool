import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { createTestCache } from '../cache/testing/cache-test-utils';
import { subjectScope } from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WordCloudSetService } from './word-cloud-set.service';

describe('WordCloudSetService', () => {
  let service: WordCloudSetService;
  // A real CacheService over FakeRedis, fresh for every test.
  let cache: CacheService;
  const mockValidateAccess = jest.fn();
  const mockPrisma: any = {
    subject: { findUnique: jest.fn() },
    studentOnSubject: { findMany: jest.fn() },
    // CacheRefs: wordCloudSet(id) uses findUnique, wordCloudToken() findFirst.
    wordCloudSet: { findUnique: jest.fn(), findFirst: jest.fn() },
  };

  beforeEach(async () => {
    cache = createTestCache().cache;
    mockPrisma.wordCloudSet.findUnique.mockResolvedValue({ subjectId: 'sub1' });
    mockPrisma.wordCloudSet.findFirst.mockResolvedValue({ subjectId: 'sub1' });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordCloudSetService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: cache },
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
      findUniqueQuestion: jest.fn(),
      createQuestion: jest.fn(),
      updateQuestion: jest.fn(),
      findSetByPublicResultsToken: jest.fn(),
      findQuestionsBySetId: jest.fn(),
      updateQuestionsBySetId: jest.fn(),
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

      expect(repo.updateQuestionsBySetId).toHaveBeenCalledWith('set1', 'sub1', {
        status: 'CLOSED',
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

      expect(repo.updateQuestionsBySetId).not.toHaveBeenCalled();
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
      expect(repo.updateQuestionsBySetId).not.toHaveBeenCalled();
    });

    it('cascades allowMultiple to child questions', async () => {
      const repo = (service as any).repository;
      repo.findUnique.mockResolvedValue({ id: 'set1', subjectId: 'sub1' });
      repo.update.mockResolvedValue({ id: 'set1', allowMultiple: true });

      await service.update(
        { setId: 'set1', allowMultiple: true },
        { id: 'user1' } as any,
      );

      expect(repo.updateQuestionsBySetId).toHaveBeenCalledWith('set1', 'sub1', {
        allowMultiple: true,
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
      repo.findQuestionsBySetId.mockResolvedValue([
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
      repo.findQuestionsBySetId.mockResolvedValue([
        { id: 'q0', question: 'A?', order: 0, status: 'OPEN' },
        { id: 'q1', question: 'B?', order: 1, status: 'OPEN' },
        { id: 'q2', question: 'C?', order: 2, status: 'OPEN' },
      ]);

      const result = await service.getPublic({ setId: 'set1' });

      expect(result.questions.map((q) => q.id)).toEqual(['q0', 'q1']);
      expect(result.activeWordCloudId).toBe('q1');
    });

    it('throws when the set does not exist, without loading it', async () => {
      const repo = (service as any).repository;
      mockPrisma.wordCloudSet.findUnique.mockResolvedValue(null);
      await expect(service.getPublic({ setId: 'nope' })).rejects.toThrow(
        new NotFoundException('Word cloud set not found'),
      );
      expect(repo.findUnique).not.toHaveBeenCalled();
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
      repo.findSetByPublicResultsToken.mockResolvedValue({
        id: 'set1',
        title: 'My set',
        status: 'OPEN',
        activeWordCloudId: 'q0', // active is the FIRST question…
        subjectId: 'sub1',
        schoolId: 'school1',
        userId: 'user1',
      });
      repo.findQuestionsBySetId.mockResolvedValue([
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
      expect(repo.findSetByPublicResultsToken).toHaveBeenCalledWith(token);
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
      repo.findSetByPublicResultsToken.mockResolvedValue({
        id: 'set1',
        title: null,
        status: 'OPEN',
        activeWordCloudId: 'q0',
      });
      repo.findQuestionsBySetId.mockResolvedValue([
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

    it('throws NotFound for an unknown token, without loading results', async () => {
      const repo = (service as any).repository;
      mockPrisma.wordCloudSet.findFirst.mockResolvedValue(null);

      await expect(service.getResultsByToken({ token })).rejects.toThrow(
        new NotFoundException('This link is no longer available'),
      );
      expect(repo.findSetByPublicResultsToken).not.toHaveBeenCalled();
    });
  });

  describe('public polls — cache units', () => {
    const token = 'a'.repeat(32);
    const set = { id: 'set1', subjectId: 'sub1', activeWordCloudId: 'q0' };
    const studentsOnly = { ...set, accessMode: 'STUDENTS_ONLY' };
    const sos1 = { id: 'sos1', createAt: new Date(0) };
    const dog = { text: 'Dog', normalized: 'dog' };
    let repo: any;

    beforeEach(() => {
      repo = (service as any).repository;
      repo.findUnique.mockResolvedValue(set);
      repo.findSetByPublicResultsToken.mockResolvedValue(set);
      repo.findQuestionsBySetId.mockResolvedValue([
        { id: 'q0', question: 'A?', order: 0, status: 'OPEN' },
        { id: 'q1', question: 'B?', order: 1, status: 'OPEN' },
      ]);
      repo.findManyAnswers.mockResolvedValue([dog]);
    });

    it('getPublic serves the set from the cache until a wordcloud bump', async () => {
      const first = await service.getPublic({ setId: 'set1' });
      // The teacher advances the question; the set repository update bumps.
      repo.findUnique.mockResolvedValue({ ...set, activeWordCloudId: 'q1' });
      expect(await service.getPublic({ setId: 'set1' })).toEqual(first);
      expect(repo.findUnique).toHaveBeenCalledTimes(1);
      await cache.bump(subjectScope('sub1', 'wordcloud'));
      const result = await service.getPublic({ setId: 'set1' });

      expect(result.questions.map((q) => q.id)).toEqual(['q0', 'q1']);
      expect(repo.findUnique).toHaveBeenCalledTimes(2);
    });

    it('getPublic reloads the STUDENTS_ONLY students after a roster bump', async () => {
      repo.findUnique.mockResolvedValue(studentsOnly);
      const findStudents = mockPrisma.studentOnSubject.findMany;
      findStudents.mockResolvedValue([sos1]);
      const first = await service.getPublic({ setId: 'set1' });
      findStudents.mockResolvedValue([sos1, { ...sos1, id: 'sos2' }]);
      // Served from Redis with its dates revived, so the response is unchanged.
      expect(await service.getPublic({ setId: 'set1' })).toEqual(first);
      await cache.bump(subjectScope('sub1', 'roster'));
      const result = await service.getPublic({ setId: 'set1' });

      expect(result.students.map((s) => s.id)).toEqual(['sos1', 'sos2']);
      expect(findStudents).toHaveBeenCalledTimes(2);
    });

    it('getPublic returns 404 for a deleted set whose ref is still cached', async () => {
      await service.getPublic({ setId: 'set1' });
      repo.findUnique.mockResolvedValue(null);
      // WordCloudSetRepository.deleteSet bumps the subject's wordcloud scope.
      await cache.bump(subjectScope('sub1', 'wordcloud'));

      await expect(service.getPublic({ setId: 'set1' })).rejects.toThrow(
        new NotFoundException('Word cloud set not found'),
      );
      // The ref came from the cache; the loader found nothing.
      expect(mockPrisma.wordCloudSet.findUnique).toHaveBeenCalledTimes(1);
      expect(repo.findUnique).toHaveBeenCalledTimes(2);
    });

    it('getResultsByToken serves the results from the cache until a wordcloud bump', async () => {
      const getOrSet = jest.spyOn(cache, 'getOrSet');
      const first = await service.getResultsByToken({ token });
      expect(await service.getResultsByToken({ token })).toEqual(first);
      expect(repo.findSetByPublicResultsToken).toHaveBeenCalledTimes(1);
      expect(getOrSet).toHaveBeenCalledWith(
        `wordCloudResults:${token}`,
        [subjectScope('sub1', 'wordcloud'), subjectScope('sub1', 'roster')],
        TTL.WORDCLOUD,
        expect.any(Function),
      );
      // Every new answer bumps the subject's wordcloud scope.
      repo.findManyAnswers.mockResolvedValue([dog, dog]);
      await cache.bump(subjectScope('sub1', 'wordcloud'));
      const result = await service.getResultsByToken({ token });

      expect(result.questions[0].totalAnswers).toBe(2);
      expect(repo.findSetByPublicResultsToken).toHaveBeenCalledTimes(2);
    });

    it('getResultsByToken returns 404 for a revoked token whose ref is still cached', async () => {
      await service.getResultsByToken({ token });
      // revokeResults clears the token; the set repository's update bumps.
      repo.findSetByPublicResultsToken.mockResolvedValue(null);
      mockPrisma.wordCloudSet.findFirst.mockResolvedValue(null);
      await cache.bump(subjectScope('sub1', 'wordcloud'));
      // The token ref has no scopes, so it still resolves the subject…
      await expect(service.refs.wordCloudToken(token)).resolves.toEqual({
        subjectId: 'sub1',
      });
      // …and the results loader re-checks the token.
      await expect(service.getResultsByToken({ token })).rejects.toThrow(
        new NotFoundException('This link is no longer available'),
      );
      expect(mockPrisma.wordCloudSet.findFirst).toHaveBeenCalledTimes(1);
      expect(repo.findSetByPublicResultsToken).toHaveBeenCalledTimes(2);
    });
  });
});
