import { Test, TestingModule } from '@nestjs/testing';
import { PushRepository } from './push.repository';
import { PrismaService } from '../prisma/prisma.service';

// Regression tests for the per-notification-send COLLSCAN on
// SubscriptionNotification: userId/studentId are optional, so Prisma filters
// compile to a non-index-eligible `$expr`/`$ne: [field, "$$REMOVE"]` pipeline
// (and the only index was the endpoint-first unique). The notification-send
// lookups must use findRaw with plain filters.

describe('PushRepository (raw index-eligible queries)', () => {
  let repository: PushRepository;

  const mockPrisma = {
    subscriptionNotification: {
      findRaw: jest.fn(),
    },
  };

  const USER_ID = '5f4b4a4e481e3caefd634a01';
  const STUDENT_ID = '6a06d7d7350a0a8a71e55408';

  const rawDoc = {
    _id: { $oid: '6a4b4a4e481e3caefd634b01' },
    createAt: { $date: '2026-08-01T00:00:00.000Z' },
    updateAt: { $date: '2026-08-01T00:00:00.000Z' },
    data: '{"endpoint":"https://push.example/e1"}',
    endpoint: 'https://push.example/e1',
    userAgent: 'Mozilla/5.0',
    expiredAt: { $date: '2026-08-03T00:00:00.000Z' },
    userId: { $oid: USER_ID },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(PushRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findLatestForUser', () => {
    it('queries with a plain (non-$expr) filter, newest first, limit 1', async () => {
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([rawDoc]);

      const result = await repository.findLatestForUser(USER_ID);

      expect(mockPrisma.subscriptionNotification.findRaw).toHaveBeenCalledWith({
        filter: { userId: { $oid: USER_ID } },
        options: { sort: { createAt: -1 }, limit: 1 },
      });
      expect(result).toMatchObject({
        id: '6a4b4a4e481e3caefd634b01',
        userId: USER_ID,
        studentId: null,
        endpoint: 'https://push.example/e1',
        data: '{"endpoint":"https://push.example/e1"}',
      });
      expect(result.createAt).toBeInstanceOf(Date);
      expect(result.expiredAt.toISOString()).toBe('2026-08-03T00:00:00.000Z');
    });

    it('returns null when the user has no subscription', async () => {
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([]);

      const result = await repository.findLatestForUser(USER_ID);

      expect(result).toBeNull();
    });

    it('maps canonical EJSON dates ({ $date: { $numberLong } })', async () => {
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([
        {
          ...rawDoc,
          createAt: { $date: { $numberLong: '1754006400000' } },
          updateAt: { $date: { $numberLong: '1754006400000' } },
          expiredAt: { $date: { $numberLong: '1754179200000' } },
        },
      ]);

      const result = await repository.findLatestForUser(USER_ID);

      expect(result.createAt.getTime()).toBe(1754006400000);
      expect(result.updateAt.getTime()).toBe(1754006400000);
      expect(result.expiredAt.getTime()).toBe(1754179200000);
    });
  });

  describe('findManyForStudents', () => {
    it('queries with a plain $in filter of ObjectIds', async () => {
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([
        { ...rawDoc, userId: null, studentId: { $oid: STUDENT_ID } },
      ]);

      const result = await repository.findManyForStudents([STUDENT_ID]);

      expect(mockPrisma.subscriptionNotification.findRaw).toHaveBeenCalledWith({
        filter: { studentId: { $in: [{ $oid: STUDENT_ID }] } },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        studentId: STUDENT_ID,
        userId: null,
      });
    });

    it('returns [] for an empty id list without querying', async () => {
      const result = await repository.findManyForStudents([]);

      expect(result).toEqual([]);
      expect(mockPrisma.subscriptionNotification.findRaw).not.toHaveBeenCalled();
    });

    it('wraps every id in the $in list and maps each document', async () => {
      const OTHER_STUDENT_ID = '6a06d7d7350a0a8a71e55409';
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([
        { ...rawDoc, userId: null, studentId: { $oid: STUDENT_ID } },
        {
          ...rawDoc,
          _id: { $oid: '6a4b4a4e481e3caefd634b02' },
          userId: null,
          studentId: { $oid: OTHER_STUDENT_ID },
        },
      ]);

      const result = await repository.findManyForStudents([
        STUDENT_ID,
        OTHER_STUDENT_ID,
      ]);

      expect(mockPrisma.subscriptionNotification.findRaw).toHaveBeenCalledWith({
        filter: {
          studentId: {
            $in: [{ $oid: STUDENT_ID }, { $oid: OTHER_STUDENT_ID }],
          },
        },
      });
      expect(result.map((r) => r.studentId)).toEqual([
        STUDENT_ID,
        OTHER_STUDENT_ID,
      ]);
    });

    it('returns [] when no student has a subscription', async () => {
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([]);

      const result = await repository.findManyForStudents([STUDENT_ID]);

      expect(result).toEqual([]);
    });
  });

  describe('findManyForUsers', () => {
    it('queries with a plain $in filter of ObjectIds', async () => {
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([rawDoc]);

      const result = await repository.findManyForUsers([USER_ID]);

      expect(mockPrisma.subscriptionNotification.findRaw).toHaveBeenCalledWith({
        filter: { userId: { $in: [{ $oid: USER_ID }] } },
      });
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(USER_ID);
    });

    it('drops null userIds so member pushes never match student subscriptions', async () => {
      mockPrisma.subscriptionNotification.findRaw.mockResolvedValue([rawDoc]);

      await repository.findManyForUsers([
        null as unknown as string,
        USER_ID,
        undefined as unknown as string,
      ]);

      expect(mockPrisma.subscriptionNotification.findRaw).toHaveBeenCalledWith({
        filter: { userId: { $in: [{ $oid: USER_ID }] } },
      });
    });

    it('returns [] without querying when every id is null', async () => {
      const result = await repository.findManyForUsers([
        null as unknown as string,
      ]);

      expect(result).toEqual([]);
      expect(mockPrisma.subscriptionNotification.findRaw).not.toHaveBeenCalled();
    });
  });
});
