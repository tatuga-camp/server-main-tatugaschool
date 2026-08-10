import {
  findFirstMemberOnSchoolByUser,
  findManyMemberOnSchoolByUser,
  findMemberOnSchoolByInvitationToken,
  findPendingInvitationsByUserOrEmail,
} from './member-on-school.raw';

// Regression tests for the per-request COLLSCAN on MemberOnSchool: userId is
// optional, so every Prisma filter on it compiles to a non-index-eligible
// `$expr`/`$ne: [field, "$$REMOVE"]` pipeline (and the model had no userId
// index at all). Permission checks must use findRaw with plain filters so the
// { userId, schoolId } index is used.

describe('member-on-school.raw helpers', () => {
  const USER_ID = '5f4b4a4e481e3caefd634a01';
  const SCHOOL_ID = '6a4b4a4e481e3caefd634d01';

  const mockPrisma = {
    memberOnSchool: {
      findRaw: jest.fn(),
    },
  };

  const rawDoc = {
    _id: { $oid: '6a4b4a4e481e3caefd634b01' },
    createAt: { $date: '2026-01-01T00:00:00.000Z' },
    updateAt: { $date: '2026-01-01T00:00:00.000Z' },
    status: 'ACCEPT',
    role: 'ADMIN',
    firstName: 'Will',
    lastName: 'T.',
    email: 'will@example.com',
    photo: 'photo.png',
    blurHash: 'LEHV6n',
    phone: '0812345678',
    userId: { $oid: USER_ID },
    schoolId: { $oid: SCHOOL_ID },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findFirstMemberOnSchoolByUser', () => {
    it('queries with a plain (non-$expr) { userId, schoolId } filter and maps EJSON', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([rawDoc]);

      const member = await findFirstMemberOnSchoolByUser(mockPrisma, {
        userId: USER_ID,
        schoolId: SCHOOL_ID,
      });

      expect(mockPrisma.memberOnSchool.findRaw).toHaveBeenCalledWith({
        filter: {
          userId: { $oid: USER_ID },
          schoolId: { $oid: SCHOOL_ID },
        },
        options: { limit: 1 },
      });
      expect(member).toMatchObject({
        id: '6a4b4a4e481e3caefd634b01',
        status: 'ACCEPT',
        role: 'ADMIN',
        email: 'will@example.com',
        userId: USER_ID,
        schoolId: SCHOOL_ID,
        invitationToken: null,
        invitationTokenExpiresAt: null,
      });
      expect(member.createAt).toBeInstanceOf(Date);
    });

    it('returns null when there is no membership', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([]);

      const member = await findFirstMemberOnSchoolByUser(mockPrisma, {
        userId: USER_ID,
        schoolId: SCHOOL_ID,
      });

      expect(member).toBeNull();
    });

    it('maps canonical EJSON dates ({ $date: { $numberLong } })', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([
        {
          ...rawDoc,
          createAt: { $date: { $numberLong: '1767225600000' } },
          updateAt: { $date: { $numberLong: '1767225600000' } },
          invitationToken: 'tok-invite',
          invitationTokenExpiresAt: { $date: { $numberLong: '1767312000000' } },
        },
      ]);

      const member = await findFirstMemberOnSchoolByUser(mockPrisma, {
        userId: USER_ID,
        schoolId: SCHOOL_ID,
      });

      expect(member.createAt.getTime()).toBe(1767225600000);
      expect(member.updateAt.getTime()).toBe(1767225600000);
      expect(member.invitationTokenExpiresAt.getTime()).toBe(1767312000000);
    });

    it('defaults status/role and nullifies absent optional fields on legacy docs', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([
        {
          _id: { $oid: '6a4b4a4e481e3caefd634b02' },
          createAt: { $date: '2026-01-01T00:00:00.000Z' },
          updateAt: { $date: '2026-01-01T00:00:00.000Z' },
          email: 'legacy@example.com',
          schoolId: { $oid: SCHOOL_ID },
        },
      ]);

      const member = await findFirstMemberOnSchoolByUser(mockPrisma, {
        userId: USER_ID,
        schoolId: SCHOOL_ID,
      });

      expect(member).toMatchObject({
        status: 'PENDDING',
        role: 'TEACHER',
        firstName: null,
        lastName: null,
        photo: null,
        blurHash: null,
        phone: null,
        invitationToken: null,
        invitationTokenExpiresAt: null,
        userId: null,
      });
    });
  });

  describe('findManyMemberOnSchoolByUser', () => {
    it('queries by userId only (index prefix) when no schoolId is given', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([rawDoc]);

      const members = await findManyMemberOnSchoolByUser(mockPrisma, {
        userId: USER_ID,
      });

      expect(mockPrisma.memberOnSchool.findRaw).toHaveBeenCalledWith({
        filter: { userId: { $oid: USER_ID } },
      });
      expect(members).toHaveLength(1);
      expect(members[0].schoolId).toBe(SCHOOL_ID);
    });

    it('adds a plain status filter when given', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([]);

      await findManyMemberOnSchoolByUser(mockPrisma, {
        userId: USER_ID,
        status: 'ACCEPT',
      });

      expect(mockPrisma.memberOnSchool.findRaw).toHaveBeenCalledWith({
        filter: { userId: { $oid: USER_ID }, status: 'ACCEPT' },
      });
    });

    it('returns an empty array when the user has no memberships', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([]);

      const members = await findManyMemberOnSchoolByUser(mockPrisma, {
        userId: USER_ID,
      });

      expect(members).toEqual([]);
    });
  });

  describe('findMemberOnSchoolByInvitationToken', () => {
    it('queries the token with a plain filter, limit 1', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([rawDoc]);

      const member = await findMemberOnSchoolByInvitationToken(
        mockPrisma,
        'tok-invite',
      );

      expect(mockPrisma.memberOnSchool.findRaw).toHaveBeenCalledWith({
        filter: { invitationToken: 'tok-invite' },
        options: { limit: 1 },
      });
      expect(member.id).toBe('6a4b4a4e481e3caefd634b01');
    });

    it('returns null when the token is unknown', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([]);

      const member = await findMemberOnSchoolByInvitationToken(
        mockPrisma,
        'nope',
      );

      expect(member).toBeNull();
    });

    it('returns null for a falsy token without querying (raw null would match token-less rows)', async () => {
      const member = await findMemberOnSchoolByInvitationToken(
        mockPrisma,
        null as unknown as string,
      );

      expect(member).toBeNull();
      expect(mockPrisma.memberOnSchool.findRaw).not.toHaveBeenCalled();
    });
  });

  describe('findPendingInvitationsByUserOrEmail', () => {
    it('queries PENDDING rows by userId OR unlinked email with plain filters', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([rawDoc]);

      const members = await findPendingInvitationsByUserOrEmail(mockPrisma, {
        userId: USER_ID,
        email: 'will@example.com',
      });

      expect(mockPrisma.memberOnSchool.findRaw).toHaveBeenCalledWith({
        filter: {
          status: 'PENDDING',
          $or: [
            { userId: { $oid: USER_ID } },
            { userId: null, email: 'will@example.com' },
          ],
        },
      });
      expect(members).toHaveLength(1);
    });

    it('returns an empty array when there are no pending invitations', async () => {
      mockPrisma.memberOnSchool.findRaw.mockResolvedValue([]);

      const members = await findPendingInvitationsByUserOrEmail(mockPrisma, {
        userId: USER_ID,
        email: 'will@example.com',
      });

      expect(members).toEqual([]);
    });
  });
});
