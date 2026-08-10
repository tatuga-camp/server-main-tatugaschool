import { Test, TestingModule } from '@nestjs/testing';
import { StudentRepository } from './student.repository';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../redis/redis.service';

// Regression test for the production COLLSCAN on CommentOnAssignment:
// commentOnAssignment.updateMany({ where: { studentId } }) goes through
// Prisma's `$expr`/`$ne: [field, "$$REMOVE"]` pipeline (studentId is
// optional), which MongoDB cannot serve from any index. The author-info
// sync must use $runCommandRaw with a plain filter instead.

describe('StudentRepository', () => {
  let repo: StudentRepository;

  const STUDENT_ID = '6a06d7d7350a0a8a71e55408';

  const mockPrisma = {
    student: { update: jest.fn() },
    studentOnSubject: { findMany: jest.fn() },
    studentOnAssignment: { updateMany: jest.fn() },
    scoreOnStudent: { updateMany: jest.fn() },
    studentOnGroup: { updateMany: jest.fn() },
    commentOnAssignment: { updateMany: jest.fn() },
    $runCommandRaw: jest.fn(),
  };

  const mockPrismaRead = {
    studentOnSubject: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T12:00:00Z'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PrismaReadService, useValue: mockPrismaRead },
        { provide: StorageService, useValue: {} },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();
    repo = module.get(StudentRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('update', () => {
    it('syncs comment author info with a plain (non-$expr) raw update so MongoDB can use the studentId index', async () => {
      mockPrisma.student.update.mockResolvedValue({
        id: STUDENT_ID,
        title: 'ด.ช.',
        firstName: 'Somchai',
        lastName: 'Jaidee',
        photo: 'photo.png',
        blurHash: 'LEHV6n',
        number: '12',
      });
      mockPrisma.studentOnSubject.findMany.mockResolvedValue([]);
      mockPrismaRead.studentOnSubject.findMany.mockResolvedValue([]);
      mockPrisma.$runCommandRaw.mockResolvedValue({ n: 0, nModified: 0, ok: 1 });

      await repo.update({
        query: { studentId: STUDENT_ID },
        body: { firstName: 'Somchai' },
      });

      expect(mockPrisma.commentOnAssignment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({
        update: 'CommentOnAssignment',
        updates: [
          {
            q: { studentId: { $oid: STUDENT_ID } },
            u: {
              $set: {
                title: 'ด.ช.',
                firstName: 'Somchai',
                lastName: 'Jaidee',
                photo: 'photo.png',
                blurHash: 'LEHV6n',
                number: '12',
                updateAt: { $date: '2026-08-10T12:00:00.000Z' },
              },
            },
            multi: true,
          },
        ],
      });
    });
  });
});
