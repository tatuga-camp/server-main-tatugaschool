import { Test, TestingModule } from '@nestjs/testing';
import { NotificationRepository } from './notification.repository';
import { PrismaService } from '../prisma/prisma.service';

// Regression tests for the production slow query on Notification:
// Prisma's findMany/count/updateMany translate `where` into a `$match: { $expr:
// { $ne: [field, "$$REMOVE"] ... } }` pipeline, which MongoDB cannot serve from
// the { studentId, isRead } / { userId, isRead } indexes ($ne inside $expr is
// never index-eligible). The repository must therefore issue raw queries with
// plain filters for the hot notification paths.

describe('NotificationRepository (raw index-eligible queries)', () => {
  let repository: NotificationRepository;

  const mockPrisma = {
    notification: {
      findRaw: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
    },
    $runCommandRaw: jest.fn(),
  };

  const STUDENT_ID = '6a4b4a4e481e3caefd634a4f';
  const USER_ID = '5f4b4a4e481e3caefd634a01';

  const rawDoc = {
    _id: { $oid: '6a4b4a4e481e3caefd634b01' },
    createAt: { $date: '2026-08-01T00:00:00.000Z' },
    studentId: { $oid: STUDENT_ID },
    actorName: 'Teacher A',
    actorId: { $oid: '6a4b4a4e481e3caefd634c01' },
    actorImage: 'photo.png',
    type: 'NEW_ANNOUNCEMENT',
    message: 'hello',
    link: 'https://student.tatugaschool.com',
    isRead: false,
    schoolId: { $oid: '6a4b4a4e481e3caefd634d01' },
    subjectId: { $oid: '6a4b4a4e481e3caefd634e01' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get(NotificationRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findManyForStudent', () => {
    it('queries with a plain (non-$expr) filter so MongoDB can use the studentId index', async () => {
      mockPrisma.notification.findRaw.mockResolvedValue([rawDoc]);

      await repository.findManyForStudent({ studentId: STUDENT_ID });

      expect(mockPrisma.notification.findRaw).toHaveBeenCalledWith({
        filter: { studentId: { $oid: STUDENT_ID }, isRead: false },
        options: { sort: { createAt: -1 }, limit: 99 },
      });
    });

    it('maps raw EJSON documents back to Notification objects', async () => {
      mockPrisma.notification.findRaw.mockResolvedValue([rawDoc]);

      const result = await repository.findManyForStudent({
        studentId: STUDENT_ID,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '6a4b4a4e481e3caefd634b01',
        studentId: STUDENT_ID,
        userId: null,
        actorName: 'Teacher A',
        actorId: '6a4b4a4e481e3caefd634c01',
        type: 'NEW_ANNOUNCEMENT',
        isRead: false,
        schoolId: '6a4b4a4e481e3caefd634d01',
        subjectId: '6a4b4a4e481e3caefd634e01',
      });
      expect(result[0].createAt).toBeInstanceOf(Date);
      expect(result[0].createAt.toISOString()).toBe('2026-08-01T00:00:00.000Z');
    });

    it('handles canonical EJSON dates ({ $date: { $numberLong } })', async () => {
      mockPrisma.notification.findRaw.mockResolvedValue([
        { ...rawDoc, createAt: { $date: { $numberLong: '1754006400000' } } },
      ]);

      const result = await repository.findManyForStudent({
        studentId: STUDENT_ID,
      });

      expect(result[0].createAt.getTime()).toBe(1754006400000);
    });
  });

  describe('findManyForUser', () => {
    it('queries with a plain (non-$expr) filter on userId', async () => {
      mockPrisma.notification.findRaw.mockResolvedValue([]);

      await repository.findManyForUser({ userId: USER_ID });

      expect(mockPrisma.notification.findRaw).toHaveBeenCalledWith({
        filter: { userId: { $oid: USER_ID }, isRead: false },
        options: { sort: { createAt: -1 }, limit: 99 },
      });
    });
  });

  describe('getUnreadCount', () => {
    it('uses a plain count command and returns n', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ n: 5, ok: 1 });

      const count = await repository.getUnreadCount({ userId: USER_ID });

      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({
        count: 'Notification',
        query: { userId: { $oid: USER_ID }, isRead: false },
      });
      expect(count).toBe(5);
    });

    it('returns 0 when the count command reports no matching documents', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ ok: 1 });

      const count = await repository.getUnreadCount({ userId: USER_ID });

      expect(count).toBe(0);
    });
  });

  describe('markAllAsRead / markAllAsReadForStudent', () => {
    it('marks all user notifications read with a plain update filter', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ n: 3, nModified: 3, ok: 1 });

      const result = await repository.markAllAsRead({ userId: USER_ID });

      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({
        update: 'Notification',
        updates: [
          {
            q: { userId: { $oid: USER_ID }, isRead: false },
            u: { $set: { isRead: true } },
            multi: true,
          },
        ],
      });
      expect(result).toEqual({ count: 3 });
    });

    it('marks all student notifications read with a plain update filter', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ n: 2, nModified: 2, ok: 1 });

      const result = await repository.markAllAsReadForStudent({
        studentId: STUDENT_ID,
      });

      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({
        update: 'Notification',
        updates: [
          {
            q: { studentId: { $oid: STUDENT_ID }, isRead: false },
            u: { $set: { isRead: true } },
            multi: true,
          },
        ],
      });
      expect(result).toEqual({ count: 2 });
    });

    it('reports a count of 0 when the update command omits nModified', async () => {
      mockPrisma.$runCommandRaw.mockResolvedValue({ n: 0, ok: 1 });

      const result = await repository.markAllAsRead({ userId: USER_ID });

      expect(result).toEqual({ count: 0 });
    });
  });
});
