import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('UserRepository', () => {
  let repo: UserRepository;
  const mockPrisma = {
    user: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T12:00:00Z'));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    repo = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('findActiveRecipients', () => {
    it('queries users active within the threshold and not deleted, verified only', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ email: 'a@b.com' }]);

      const result = await repo.findActiveRecipients(30);

      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      const args = mockPrisma.user.findMany.mock.calls[0][0];
      expect(args.select).toEqual({ email: true });
      expect(args.where.isDeleted).toBe(false);
      expect(args.where.isVerifyEmail).toBe(true);
      const since = args.where.lastActiveAt.gte as Date;
      const expected = new Date(
        Date.parse('2026-05-23T12:00:00Z') - 30 * 24 * 60 * 60 * 1000,
      );
      expect(since.getTime()).toBe(expected.getTime());
      expect(result).toEqual([{ email: 'a@b.com' }]);
    });

    it('defaults to a 30-day threshold when no argument is given', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      await repo.findActiveRecipients();
      const args = mockPrisma.user.findMany.mock.calls[0][0];
      const since = args.where.lastActiveAt.gte as Date;
      const expected = new Date(
        Date.parse('2026-05-23T12:00:00Z') - 30 * 24 * 60 * 60 * 1000,
      );
      expect(since.getTime()).toBe(expected.getTime());
    });
  });
});
