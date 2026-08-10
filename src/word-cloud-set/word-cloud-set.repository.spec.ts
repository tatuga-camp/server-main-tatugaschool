import { Test, TestingModule } from '@nestjs/testing';
import { WordCloudSetRepository } from './word-cloud-set.repository';
import { PrismaService } from '../prisma/prisma.service';

// Regression tests for the $expr COLLSCAN on optional-field filters:
// publicResultsToken (WordCloudSet) and wordCloudSetId (WordCloud) are
// optional, so Prisma filters on them cannot use their indexes. The raw
// methods must issue plain filters.

describe('WordCloudSetRepository (raw index-eligible queries)', () => {
  let repository: WordCloudSetRepository;

  const mockPrisma = {
    wordCloudSet: { findRaw: jest.fn(), delete: jest.fn() },
    wordCloud: { findRaw: jest.fn(), deleteMany: jest.fn() },
    wordCloudAnswer: { deleteMany: jest.fn() },
    $runCommandRaw: jest.fn(),
  };

  const SET_ID = '6a4b4a4e481e3caefd634d01';

  const rawSet = {
    _id: { $oid: SET_ID },
    createAt: { $date: '2026-07-01T00:00:00.000Z' },
    updateAt: { $date: '2026-07-01T00:00:00.000Z' },
    title: 'Week 3',
    status: 'OPEN',
    accessMode: 'PUBLIC',
    allowMultiple: false,
    activeWordCloudId: { $oid: '6a4b4a4e481e3caefd634e01' },
    publicResultsToken: 'tok-public',
    subjectId: { $oid: '6a4b4a4e481e3caefd634f01' },
    schoolId: { $oid: '6a4b4a4e481e3caefd634f02' },
    userId: { $oid: '6a4b4a4e481e3caefd634f03' },
  };

  const rawQuestion = (id: string, order: number) => ({
    _id: { $oid: id },
    createAt: { $date: '2026-07-01T00:00:00.000Z' },
    updateAt: { $date: '2026-07-01T00:00:00.000Z' },
    question: 'A?',
    status: 'OPEN',
    accessMode: 'PUBLIC',
    allowMultiple: false,
    subjectId: { $oid: '6a4b4a4e481e3caefd634f01' },
    schoolId: { $oid: '6a4b4a4e481e3caefd634f02' },
    userId: { $oid: '6a4b4a4e481e3caefd634f03' },
    wordCloudSetId: { $oid: SET_ID },
    order,
  });

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T12:00:00Z'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WordCloudSetRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(WordCloudSetRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('findSetByPublicResultsToken', () => {
    it('queries the token with a plain filter, limit 1, and maps EJSON', async () => {
      mockPrisma.wordCloudSet.findRaw.mockResolvedValue([rawSet]);

      const set = await repository.findSetByPublicResultsToken('tok-public');

      expect(mockPrisma.wordCloudSet.findRaw).toHaveBeenCalledWith({
        filter: { publicResultsToken: 'tok-public' },
        options: { limit: 1 },
      });
      expect(set).toMatchObject({
        id: SET_ID,
        title: 'Week 3',
        status: 'OPEN',
        activeWordCloudId: '6a4b4a4e481e3caefd634e01',
        publicResultsToken: 'tok-public',
      });
      expect(set.createAt).toBeInstanceOf(Date);
    });

    it('returns null for an unknown token', async () => {
      mockPrisma.wordCloudSet.findRaw.mockResolvedValue([]);

      const set = await repository.findSetByPublicResultsToken('nope');

      expect(set).toBeNull();
    });

    it('returns null for a falsy token without querying (raw null would match token-less sets)', async () => {
      const set = await repository.findSetByPublicResultsToken(
        undefined as unknown as string,
      );

      expect(set).toBeNull();
      expect(mockPrisma.wordCloudSet.findRaw).not.toHaveBeenCalled();
    });

    it('maps canonical EJSON dates ({ $date: { $numberLong } })', async () => {
      mockPrisma.wordCloudSet.findRaw.mockResolvedValue([
        {
          ...rawSet,
          createAt: { $date: { $numberLong: '1751328000000' } },
          updateAt: { $date: { $numberLong: '1751328000000' } },
        },
      ]);

      const set = await repository.findSetByPublicResultsToken('tok-public');

      expect(set.createAt.getTime()).toBe(1751328000000);
      expect(set.updateAt.getTime()).toBe(1751328000000);
    });

    it('defaults status/accessMode/allowMultiple on legacy sets missing optional fields', async () => {
      mockPrisma.wordCloudSet.findRaw.mockResolvedValue([
        {
          _id: { $oid: SET_ID },
          createAt: { $date: '2026-07-01T00:00:00.000Z' },
          updateAt: { $date: '2026-07-01T00:00:00.000Z' },
          subjectId: { $oid: '6a4b4a4e481e3caefd634f01' },
          schoolId: { $oid: '6a4b4a4e481e3caefd634f02' },
          userId: { $oid: '6a4b4a4e481e3caefd634f03' },
        },
      ]);

      const set = await repository.findSetByPublicResultsToken('tok-public');

      expect(set).toMatchObject({
        title: null,
        status: 'OPEN',
        accessMode: 'PUBLIC',
        allowMultiple: false,
        activeWordCloudId: null,
        publicResultsToken: null,
      });
    });
  });

  describe('findQuestionsBySetId', () => {
    it('queries with a plain ObjectId filter sorted by order asc', async () => {
      mockPrisma.wordCloud.findRaw.mockResolvedValue([
        rawQuestion('6a4b4a4e481e3caefd634e01', 0),
        rawQuestion('6a4b4a4e481e3caefd634e02', 1),
      ]);

      const questions = await repository.findQuestionsBySetId(SET_ID);

      expect(mockPrisma.wordCloud.findRaw).toHaveBeenCalledWith({
        filter: { wordCloudSetId: { $oid: SET_ID } },
        options: { sort: { order: 1 } },
      });
      expect(questions.map((q) => q.order)).toEqual([0, 1]);
      expect(questions[0].wordCloudSetId).toBe(SET_ID);
    });

    it('returns [] when the set has no questions', async () => {
      mockPrisma.wordCloud.findRaw.mockResolvedValue([]);

      const questions = await repository.findQuestionsBySetId(SET_ID);

      expect(questions).toEqual([]);
    });

    it('coerces canonical EJSON ints ({ $numberInt }/{ $numberLong }) for order', async () => {
      mockPrisma.wordCloud.findRaw.mockResolvedValue([
        {
          ...rawQuestion('6a4b4a4e481e3caefd634e01', 0),
          order: { $numberInt: '2' },
        },
        {
          ...rawQuestion('6a4b4a4e481e3caefd634e02', 0),
          order: { $numberLong: '3' },
        },
      ]);

      const questions = await repository.findQuestionsBySetId(SET_ID);

      expect(questions.map((q) => q.order)).toEqual([2, 3]);
    });

    it('defaults order to 0 and status/accessMode on legacy questions missing optional fields', async () => {
      mockPrisma.wordCloud.findRaw.mockResolvedValue([
        {
          _id: { $oid: '6a4b4a4e481e3caefd634e03' },
          createAt: { $date: '2026-07-01T00:00:00.000Z' },
          updateAt: { $date: '2026-07-01T00:00:00.000Z' },
          question: 'Legacy?',
          subjectId: { $oid: '6a4b4a4e481e3caefd634f01' },
          schoolId: { $oid: '6a4b4a4e481e3caefd634f02' },
          userId: { $oid: '6a4b4a4e481e3caefd634f03' },
        },
      ]);

      const questions = await repository.findQuestionsBySetId(SET_ID);

      expect(questions[0]).toMatchObject({
        order: 0,
        status: 'OPEN',
        accessMode: 'PUBLIC',
        allowMultiple: false,
        wordCloudSetId: null,
      });
    });
  });

  describe('updateQuestionsBySetId', () => {
    it('issues a plain-filter multi update including updateAt', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ ok: 1, n: 2, nModified: 2 });

      await repository.updateQuestionsBySetId(SET_ID, { status: 'CLOSED' });

      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({
        update: 'WordCloud',
        updates: [
          {
            q: { wordCloudSetId: { $oid: SET_ID } },
            u: {
              $set: {
                status: 'CLOSED',
                updateAt: { $date: '2026-08-10T12:00:00.000Z' },
              },
            },
            multi: true,
          },
        ],
      });
    });

    it('throws when the update command reports write errors instead of swallowing them', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({
        ok: 1,
        n: 1,
        nModified: 0,
        writeErrors: [{ index: 0, code: 121, errmsg: 'validation failed' }],
      });

      await expect(
        repository.updateQuestionsBySetId(SET_ID, { status: 'CLOSED' }),
      ).rejects.toThrow(/Failed to cascade/);
    });
  });

  describe('deleteSet', () => {
    it('collects question ids with a plain projected filter, then cascades the deletes', async () => {
      mockPrisma.wordCloud.findRaw.mockResolvedValue([
        { _id: { $oid: '6a4b4a4e481e3caefd634e01' } },
        { _id: { $oid: '6a4b4a4e481e3caefd634e02' } },
      ]);
      mockPrisma.wordCloudAnswer.deleteMany.mockResolvedValue({ count: 4 });
      mockPrisma.wordCloud.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.wordCloudSet.delete.mockResolvedValue({ id: SET_ID });

      const deleted = await repository.deleteSet(SET_ID);

      expect(mockPrisma.wordCloud.findRaw).toHaveBeenCalledWith({
        filter: { wordCloudSetId: { $oid: SET_ID } },
        options: { projection: { _id: 1 } },
      });
      expect(mockPrisma.wordCloudAnswer.deleteMany).toHaveBeenCalledWith({
        where: {
          wordCloudId: {
            in: ['6a4b4a4e481e3caefd634e01', '6a4b4a4e481e3caefd634e02'],
          },
        },
      });
      expect(mockPrisma.wordCloud.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['6a4b4a4e481e3caefd634e01', '6a4b4a4e481e3caefd634e02'],
          },
        },
      });
      expect(mockPrisma.wordCloudSet.delete).toHaveBeenCalledWith({
        where: { id: SET_ID },
      });
      expect(deleted).toEqual({ id: SET_ID });
    });

    it('skips the cascade deletes when the set has no questions', async () => {
      mockPrisma.wordCloud.findRaw.mockResolvedValue([]);
      mockPrisma.wordCloudSet.delete.mockResolvedValue({ id: SET_ID });

      await repository.deleteSet(SET_ID);

      expect(mockPrisma.wordCloudAnswer.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.wordCloud.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.wordCloudSet.delete).toHaveBeenCalledWith({
        where: { id: SET_ID },
      });
    });
  });
});
