import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('UserRepository', () => {
  let repo: UserRepository;
  const mockPrisma = {
    user: { findMany: jest.fn(), update: jest.fn(), findRaw: jest.fn() },
    memberOnSchool: { updateMany: jest.fn() },
    teacherOnSubject: { updateMany: jest.fn() },
    commentOnAssignment: { updateMany: jest.fn() },
    $runCommandRaw: jest.fn(),
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
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'a@b.com', language: 'th' },
      ]);

      const result = await repo.findActiveRecipients(30);

      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      const args = mockPrisma.user.findMany.mock.calls[0][0];
      expect(args.select).toEqual({ email: true, language: true });
      expect(args.where.isDeleted).toBe(false);
      expect(args.where.isVerifyEmail).toBe(true);
      const since = args.where.lastActiveAt.gte as Date;
      const expected = new Date(
        Date.parse('2026-05-23T12:00:00Z') - 30 * 24 * 60 * 60 * 1000,
      );
      expect(since.getTime()).toBe(expected.getTime());
      expect(result).toEqual([{ email: 'a@b.com', language: 'th' }]);
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

  // Regression tests for the User COLLSCAN on token lookups: the tokens are
  // optional fields, so Prisma findFirst compiles to a non-index-eligible
  // `$expr`/`$ne: [field, "$$REMOVE"]` filter that scans the whole User
  // collection per email-verify / password-reset click. Must use findRaw.
  describe('findByVerifyToken / findByResetToken', () => {
    const rawUser = {
      _id: { $oid: '5f4b4a4e481e3caefd634a01' },
      createAt: { $date: '2026-01-01T00:00:00.000Z' },
      updateAt: { $date: '2026-01-01T00:00:00.000Z' },
      firstName: 'Will',
      lastName: 'T.',
      email: 'will@example.com',
      phone: '0812345678',
      photo: 'photo.png',
      blurHash: 'LEHV6n',
      password: 'hashed',
      role: 'USER',
      isVerifyEmail: false,
      verifyEmailToken: 'tok-verify',
      verifyEmailTokenExpiresAt: { $date: '2026-05-24T12:00:00.000Z' },
      language: 'th',
      isDoneSurvey: true,
      lastActiveAt: { $date: '2026-05-23T00:00:00.000Z' },
      isResetPassword: false,
      provider: 'LOCAL',
      isDeleted: false,
      resetPasswordToken: 'tok-reset',
      resetPasswordTokenExpiresAt: { $date: '2026-05-24T12:00:00.000Z' },
      favoritSchool: { $oid: '6a4b4a4e481e3caefd634d01' },
    };

    it('findByVerifyToken uses a plain (non-$expr) filter and maps EJSON back', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([rawUser]);

      const user = await repo.findByVerifyToken({
        verifyEmailToken: 'tok-verify',
      });

      expect(mockPrisma.user.findRaw).toHaveBeenCalledWith({
        filter: { verifyEmailToken: 'tok-verify' },
        options: { limit: 1 },
      });
      expect(user).toMatchObject({
        id: '5f4b4a4e481e3caefd634a01',
        email: 'will@example.com',
        role: 'USER',
        provider: 'LOCAL',
        providerId: null,
        deleteAt: null,
        favoritSchool: '6a4b4a4e481e3caefd634d01',
      });
      expect(user.verifyEmailTokenExpiresAt).toBeInstanceOf(Date);
      expect(user.verifyEmailTokenExpiresAt.toISOString()).toBe(
        '2026-05-24T12:00:00.000Z',
      );
    });

    it('findByVerifyToken returns null when no user matches', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([]);

      const user = await repo.findByVerifyToken({
        verifyEmailToken: 'nope',
      });

      expect(user).toBeNull();
    });

    it('findByResetToken uses a plain (non-$expr) filter', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([rawUser]);

      const user = await repo.findByResetToken({
        resetPasswordToken: 'tok-reset',
      });

      expect(mockPrisma.user.findRaw).toHaveBeenCalledWith({
        filter: { resetPasswordToken: 'tok-reset' },
        options: { limit: 1 },
      });
      expect(user.resetPasswordTokenExpiresAt).toBeInstanceOf(Date);
    });

    it('findByResetToken returns null when no user matches', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([]);

      const user = await repo.findByResetToken({
        resetPasswordToken: 'nope',
      });

      expect(user).toBeNull();
    });

    it('returns null for a falsy token without querying (raw null/undefined filters would over-match)', async () => {
      const byVerify = await repo.findByVerifyToken({
        verifyEmailToken: undefined as unknown as string,
      });
      const byReset = await repo.findByResetToken({
        resetPasswordToken: null as unknown as string,
      });

      expect(byVerify).toBeNull();
      expect(byReset).toBeNull();
      expect(mockPrisma.user.findRaw).not.toHaveBeenCalled();
    });

    it('maps canonical EJSON dates ({ $date: { $numberLong } })', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([
        {
          ...rawUser,
          createAt: { $date: { $numberLong: '1767225600000' } },
          updateAt: { $date: { $numberLong: '1767225600000' } },
          lastActiveAt: { $date: { $numberLong: '1779537600000' } },
          verifyEmailTokenExpiresAt: { $date: { $numberLong: '1779624000000' } },
        },
      ]);

      const user = await repo.findByVerifyToken({
        verifyEmailToken: 'tok-verify',
      });

      expect(user.createAt.getTime()).toBe(1767225600000);
      expect(user.lastActiveAt.getTime()).toBe(1779537600000);
      expect(user.verifyEmailTokenExpiresAt.getTime()).toBe(1779624000000);
    });

    it('defaults role/language/flags on legacy users missing optional fields', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([
        {
          _id: { $oid: '5f4b4a4e481e3caefd634a02' },
          createAt: { $date: '2026-01-01T00:00:00.000Z' },
          updateAt: { $date: '2026-01-01T00:00:00.000Z' },
          firstName: 'Legacy',
          lastName: 'User',
          email: 'legacy@example.com',
          phone: '0800000000',
          photo: 'photo.png',
          provider: 'LOCAL',
          lastActiveAt: { $date: '2026-01-01T00:00:00.000Z' },
        },
      ]);

      const user = await repo.findByVerifyToken({
        verifyEmailToken: 'tok-verify',
      });

      expect(user).toMatchObject({
        role: 'USER',
        language: 'en',
        isVerifyEmail: false,
        isDoneSurvey: false,
        isResetPassword: false,
        isDeleted: false,
        blurHash: null,
        password: null,
        createBySchoolId: null,
        verifyEmailToken: null,
        verifyEmailTokenExpiresAt: null,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        favoritSchool: null,
      });
    });
  });

  // Regression tests for the User COLLSCAN on the invite-teacher email search:
  // Prisma `email: { contains }` compiles to an unanchored $regexMatch inside a
  // non-index-eligible `$expr` — every search scanned the whole User
  // collection. Must use findRaw with a plain prefix-anchored $regex so the
  // { email } unique index serves both the match and the sort.
  describe('findManyVerifiedByEmailPrefix', () => {
    const rawUser = {
      _id: { $oid: '5f4b4a4e481e3caefd634a01' },
      createAt: { $date: '2026-01-01T00:00:00.000Z' },
      updateAt: { $date: '2026-01-01T00:00:00.000Z' },
      firstName: 'Will',
      lastName: 'T.',
      email: 'will@example.com',
      phone: '0812345678',
      photo: 'photo.png',
      role: 'USER',
      isVerifyEmail: true,
      language: 'th',
      lastActiveAt: { $date: '2026-05-23T00:00:00.000Z' },
      provider: 'LOCAL',
    };

    it('uses a plain (non-$expr) prefix-anchored filter served by the email index', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([rawUser]);

      const users = await repo.findManyVerifiedByEmailPrefix({
        email: 'will@example',
        limit: 5,
      });

      expect(mockPrisma.user.findRaw).toHaveBeenCalledWith({
        filter: {
          email: { $regex: '^will@example' },
          isVerifyEmail: true,
        },
        options: { limit: 5, sort: { email: 1 } },
      });
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        id: '5f4b4a4e481e3caefd634a01',
        email: 'will@example.com',
        isVerifyEmail: true,
      });
      expect(users[0].createAt).toBeInstanceOf(Date);
    });

    it('escapes regex metacharacters in the user-supplied input', async () => {
      mockPrisma.user.findRaw.mockResolvedValue([]);

      await repo.findManyVerifiedByEmailPrefix({ email: 'a.b+c@x' });

      expect(mockPrisma.user.findRaw).toHaveBeenCalledWith({
        filter: {
          email: { $regex: '^a\\.b\\+c@x' },
          isVerifyEmail: true,
        },
        options: { limit: 5, sort: { email: 1 } },
      });
    });

    it('returns [] for a falsy input without querying', async () => {
      const users = await repo.findManyVerifiedByEmailPrefix({
        email: '',
      });

      expect(users).toEqual([]);
      expect(mockPrisma.user.findRaw).not.toHaveBeenCalled();
    });
  });

  // Regression test for the CommentOnAssignment COLLSCAN: userId is optional,
  // so Prisma's updateMany filter compiles to a non-index-eligible
  // `$expr`/`$ne: [field, "$$REMOVE"]` pipeline. The author-info sync must use
  // $runCommandRaw with a plain filter so the { userId } index is used.
  describe('update', () => {
    const USER_ID = '5f4b4a4e481e3caefd634a01';

    it('syncs comment author info with a plain (non-$expr) raw update', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: USER_ID,
        firstName: 'Will',
        lastName: 'T.',
        email: 'will@example.com',
        phone: '0812345678',
        photo: 'photo.png',
        blurHash: 'LEHV6n',
      });
      mockPrisma.$runCommandRaw.mockResolvedValue({ n: 0, nModified: 0, ok: 1 });

      await repo.update({
        where: { id: USER_ID },
        data: { firstName: 'Will' },
      });

      expect(mockPrisma.commentOnAssignment.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.memberOnSchool.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({
        update: 'MemberOnSchool',
        updates: [
          {
            q: { userId: { $oid: USER_ID } },
            u: {
              $set: {
                firstName: 'Will',
                lastName: 'T.',
                email: 'will@example.com',
                phone: '0812345678',
                photo: 'photo.png',
                blurHash: 'LEHV6n',
                updateAt: { $date: '2026-05-23T12:00:00.000Z' },
              },
            },
            multi: true,
          },
        ],
      });
      expect(mockPrisma.$runCommandRaw).toHaveBeenCalledWith({
        update: 'CommentOnAssignment',
        updates: [
          {
            q: { userId: { $oid: USER_ID } },
            u: {
              $set: {
                firstName: 'Will',
                lastName: 'T.',
                email: 'will@example.com',
                phone: '0812345678',
                photo: 'photo.png',
                blurHash: 'LEHV6n',
                updateAt: { $date: '2026-05-23T12:00:00.000Z' },
              },
            },
            multi: true,
          },
        ],
      });
    });
  });

});
