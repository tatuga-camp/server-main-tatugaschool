import { Test, TestingModule } from '@nestjs/testing';
import { MemberOnSchoolService } from './member-on-school.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../web-push/push.service';
import { SchoolService } from '../school/school.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('MemberOnSchoolService', () => {
  let service: MemberOnSchoolService;

  const mockPrismaService = {
    memberOnSchool: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  const mockPushService = {
    pushRepository: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    sendNotification: jest.fn(),
  };

  const mockSchoolService = {
    schoolRepository: {
      findMany: jest.fn(),
      getSchoolById: jest.fn(),
    },
    ValidateLimit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemberOnSchoolService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PushService, useValue: mockPushService },
        { provide: SchoolService, useValue: mockSchoolService },
      ],
    }).compile();

    service = module.get<MemberOnSchoolService>(MemberOnSchoolService);

    service.memberOnSchoolRepository = {
      getByUserId: jest.fn(),
      getMemberOnSchoolById: jest.fn(),
      findMany: jest.fn(),
      getMemberOnSchoolByEmailAndSchool: jest.fn(),
      create: jest.fn(),
      updateMemberOnSchool: jest.fn(),
      delete: jest.fn(),
      getAllMemberOnSchoolsBySchoolId: jest.fn(),
    } as any;

    (service as any).userRepository = {
      findMany: jest.fn().mockResolvedValue([]),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendInviteEmail', () => {
    it('sends Flow A template (link to /account?menu=Invitations) when no invitationToken', async () => {
      const member: any = {
        id: 'm1',
        email: 'alice@example.com',
        firstName: 'Alice',
        invitationToken: null,
      };
      const school: any = { id: 'sch1', title: 'My School' };

      await (service as any).sendInviteEmail(member, school);

      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      const arg = mockEmailService.sendMail.mock.calls[0][0];
      expect(arg.to).toBe('alice@example.com');
      expect(arg.subject).toContain('Invite to join school');
      expect(arg.html).toContain('/account?menu=Invitations');
      expect(arg.html).not.toContain('invitationToken=');
    });

    it('sends Flow B template (link to /auth/sign-up?invitationToken=...) when invitationToken present', async () => {
      const member: any = {
        id: 'm2',
        email: 'bob@example.com',
        firstName: null,
        invitationToken: 'tok-xyz',
      };
      const school: any = { id: 'sch1', title: 'My School' };

      await (service as any).sendInviteEmail(member, school);

      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      const arg = mockEmailService.sendMail.mock.calls[0][0];
      expect(arg.to).toBe('bob@example.com');
      expect(arg.html).toContain('/auth/sign-up?invitationToken=tok-xyz');
      expect(arg.html).toContain('expires in 7 days');
      expect(arg.html).not.toContain('/account?menu=Invitations');
    });
  });

  describe('createMemberOnSchool', () => {
    const adminUser = { id: 'admin1', email: 'admin@x.com' } as any;
    const school = {
      id: 'sch1',
      title: 'My School',
      limitSchoolMember: 100,
    } as any;

    const dto = (overrides: any = {}) => ({
      schoolId: 'sch1',
      email: 'invitee@example.com',
      role: 'TEACHER',
      ...overrides,
    });

    beforeEach(() => {
      mockSchoolService.schoolRepository.getSchoolById.mockResolvedValue(school);
      mockSchoolService.ValidateLimit.mockResolvedValue(undefined);
      (service as any).memberOnSchoolRepository.findMany.mockResolvedValue([]);
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        userId: 'admin1',
        schoolId: 'sch1',
        status: 'ACCEPT',
        role: 'ADMIN',
      });
    });

    it('creates an existing-user invite with userId set and no token', async () => {
      (service as any).userRepository.findByEmail.mockResolvedValue({
        id: 'user2',
        email: 'invitee@example.com',
        firstName: 'Eve',
        lastName: 'Doe',
        photo: 'p',
        phone: '123',
        blurHash: 'b',
      });
      (service as any).memberOnSchoolRepository
        .getMemberOnSchoolByEmailAndSchool.mockResolvedValue(null);
      (service as any).memberOnSchoolRepository.create.mockImplementation(
        async (r: any) => ({ id: 'm-new', ...r }),
      );

      const result = await service.createMemberOnSchool(dto(), adminUser);

      expect(
        (service as any).memberOnSchoolRepository.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user2',
          email: 'invitee@example.com',
          firstName: 'Eve',
          invitationToken: null,
          invitationTokenExpiresAt: null,
        }),
      );
      expect(result.id).toBe('m-new');
      expect(mockEmailService.sendMail).toHaveBeenCalled();
    });

    it('creates a new-email invite with userId=null, token set, expiresAt = now+7d', async () => {
      (service as any).userRepository.findByEmail.mockResolvedValue(null);
      (service as any).memberOnSchoolRepository
        .getMemberOnSchoolByEmailAndSchool.mockResolvedValue(null);
      (service as any).memberOnSchoolRepository.create.mockImplementation(
        async (r: any) => ({ id: 'm-new', ...r }),
      );

      const before = Date.now();
      await service.createMemberOnSchool(dto(), adminUser);
      const after = Date.now();

      const created = (service as any).memberOnSchoolRepository.create.mock
        .calls[0][0];
      expect(created.userId).toBeNull();
      expect(created.firstName).toBeNull();
      expect(created.email).toBe('invitee@example.com');
      expect(created.invitationToken).toMatch(/^[0-9a-f]{64}$/);
      const expiresMs = new Date(created.invitationTokenExpiresAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
    });

    it('refreshes expiry and resends email when a pending invite already exists', async () => {
      const existing = {
        id: 'm-existing',
        email: 'invitee@example.com',
        schoolId: 'sch1',
        status: 'PENDDING',
        invitationToken: 'old-token',
        invitationTokenExpiresAt: new Date('2020-01-01'),
      };
      (service as any).userRepository.findByEmail.mockResolvedValue(null);
      (service as any).memberOnSchoolRepository
        .getMemberOnSchoolByEmailAndSchool.mockResolvedValue(existing);
      (service as any).memberOnSchoolRepository.updateMemberOnSchool.mockResolvedValue(
        existing,
      );

      const result = await service.createMemberOnSchool(dto(), adminUser);

      expect(
        (service as any).memberOnSchoolRepository.create,
      ).not.toHaveBeenCalled();
      expect(
        (service as any).memberOnSchoolRepository.updateMemberOnSchool,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { id: 'm-existing' },
          data: expect.objectContaining({
            invitationTokenExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockEmailService.sendMail).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('m-existing');
    });

    it('throws ForbiddenException when invitee is already an ACCEPT member', async () => {
      (service as any).memberOnSchoolRepository
        .getMemberOnSchoolByEmailAndSchool.mockResolvedValue({
        id: 'm-accepted',
        status: 'ACCEPT',
      });

      await expect(
        service.createMemberOnSchool(dto(), adminUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateAccess', () => {
    it('should pass validation if member is accepted', async () => {
      const mockMember = { userId: 'u1', schoolId: 'sch1', status: 'ACCEPT' };
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue(mockMember);

      const result = await service.validateAccess({
        user: { id: 'u1' } as any,
        schoolId: 'sch1',
      });
      expect(result).toEqual(mockMember);
    });

    it('should throw ForbiddenException if member not accepted or not found', async () => {
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue(null);

      await expect(
        service.validateAccess({ user: { id: 'u1' } as any, schoolId: 'sch1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createMemberOnSchool', () => {
    it('should throw NotFoundException if school not found', async () => {
      mockSchoolService.schoolRepository.getSchoolById.mockResolvedValue(null);

      await expect(
        service.createMemberOnSchool({ schoolId: 'sch1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should invite user and send email', async () => {
      const mockSchool = { id: 'sch1', title: 'Sch' };
      mockSchoolService.schoolRepository.getSchoolById.mockResolvedValue(
        mockSchool,
      );
      (
        service.memberOnSchoolRepository.findMany as jest.Mock
      ).mockResolvedValue([]);
      mockSchoolService.ValidateLimit.mockResolvedValue(true);
      jest
        .spyOn(service, 'validateAccess')
        .mockResolvedValue({ role: 'ADMIN' } as any);

      const mockNewMember = {
        id: 'u2',
        email: 'test@test.com',
        firstName: 'John',
      };
      (service as any).userRepository.findByEmail.mockResolvedValue(
        mockNewMember,
      );
      (
        service.memberOnSchoolRepository
          .getMemberOnSchoolByEmailAndSchool as jest.Mock
      ).mockResolvedValue(null);
      (service.memberOnSchoolRepository.create as jest.Mock).mockResolvedValue({
        id: 'm1',
      });
      mockEmailService.sendMail.mockResolvedValue({});

      const result = await service.createMemberOnSchool(
        { schoolId: 'sch1', role: 'TEACHER', email: 'test@test.com' },
        { id: 'u1' } as any,
      );

      expect(service.memberOnSchoolRepository.create).toHaveBeenCalled();
      expect(mockEmailService.sendMail).toHaveBeenCalled();
      expect(result.id).toBe('m1');
    });

    it('should throw ForbiddenException if trying to invite admin without being admin', async () => {
      mockSchoolService.schoolRepository.getSchoolById.mockResolvedValue({
        id: 'sch1',
      });
      (
        service.memberOnSchoolRepository.findMany as jest.Mock
      ).mockResolvedValue([]);
      mockSchoolService.ValidateLimit.mockResolvedValue(true);
      jest
        .spyOn(service, 'validateAccess')
        .mockResolvedValue({ role: 'TEACHER' } as any);

      await expect(
        service.createMemberOnSchool(
          { schoolId: 'sch1', role: 'ADMIN' } as any,
          {} as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMemberOnSchool', () => {
    it('should update member if admin', async () => {
      const dto: any = { query: { memberOnSchoolId: 'm1' }, body: {} };
      (
        service.memberOnSchoolRepository.getMemberOnSchoolById as jest.Mock
      ).mockResolvedValue({ id: 'm1', schoolId: 'sch1' });
      jest
        .spyOn(service, 'validateAccess')
        .mockResolvedValue({ role: 'ADMIN' } as any);
      (
        service.memberOnSchoolRepository.updateMemberOnSchool as jest.Mock
      ).mockResolvedValue({ id: 'm1' });

      const result = await service.updateMemberOnSchool(dto, {
        id: 'u1',
      } as any);

      expect(
        service.memberOnSchoolRepository.updateMemberOnSchool,
      ).toHaveBeenCalled();
      expect(result.id).toBe('m1');
    });

    it('should throw ForbiddenException if not admin', async () => {
      const dto: any = { query: { memberOnSchoolId: 'm1' }, body: {} };
      (
        service.memberOnSchoolRepository.getMemberOnSchoolById as jest.Mock
      ).mockResolvedValue({ id: 'm1', schoolId: 'sch1' });
      jest
        .spyOn(service, 'validateAccess')
        .mockResolvedValue({ role: 'TEACHER' } as any);

      await expect(
        service.updateMemberOnSchool(dto, { id: 'u1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('AcceptMemberOnSchool', () => {
    it('should accept member', async () => {
      (
        service.memberOnSchoolRepository.getMemberOnSchoolById as jest.Mock
      ).mockResolvedValue({ id: 'm1', schoolId: 'sch1', userId: 'u1' });
      (
        service.memberOnSchoolRepository.findMany as jest.Mock
      ).mockResolvedValue([]);
      (
        service.memberOnSchoolRepository.updateMemberOnSchool as jest.Mock
      ).mockResolvedValue({});

      const result = await service.AcceptMemberOnSchool(
        {
          query: { memberOnSchoolId: 'm1' },
          body: { status: 'ACCEPT' },
        } as any,
        { id: 'u1' } as any,
      );

      expect(
        service.memberOnSchoolRepository.updateMemberOnSchool,
      ).toHaveBeenCalled();
      expect(result.message).toBe('Accept success');
    });

    it('should reject member', async () => {
      (
        service.memberOnSchoolRepository.getMemberOnSchoolById as jest.Mock
      ).mockResolvedValue({ id: 'm1', schoolId: 'sch1', userId: 'u1' });
      (
        service.memberOnSchoolRepository.findMany as jest.Mock
      ).mockResolvedValue([]);
      (service.memberOnSchoolRepository.delete as jest.Mock).mockResolvedValue(
        {},
      );

      const result = await service.AcceptMemberOnSchool(
        {
          query: { memberOnSchoolId: 'm1' },
          body: { status: 'REJECT' },
        } as any,
        { id: 'u1' } as any,
      );

      expect(service.memberOnSchoolRepository.delete).toHaveBeenCalled();
      expect(result.message).toBe('Reject success');
    });
  });

  describe('deleteMemberOnSchool', () => {
    it('should delete member', async () => {
      (
        service.memberOnSchoolRepository.getMemberOnSchoolById as jest.Mock
      ).mockResolvedValue({ id: 'm1', schoolId: 'sch1', userId: 'u2' });
      jest
        .spyOn(service, 'validateAccess')
        .mockResolvedValue({ role: 'ADMIN' } as any);
      (
        service.memberOnSchoolRepository
          .getAllMemberOnSchoolsBySchoolId as jest.Mock
      ).mockResolvedValue([{ role: 'ADMIN' }, { role: 'TEACHER' }]);
      (service.memberOnSchoolRepository.delete as jest.Mock).mockResolvedValue({
        id: 'm1',
      });
      (service as any).userRepository.findById.mockResolvedValue({
        id: 'u2',
        favoritSchool: 'sch2',
      });

      const result = await service.deleteMemberOnSchool(
        { memberOnSchoolId: 'm1' } as any,
        { id: 'u1' } as any,
      );

      expect(service.memberOnSchoolRepository.delete).toHaveBeenCalled();
      expect(result.id).toBe('m1');
    });

    it('should throw BadRequestException if deleting last admin', async () => {
      (
        service.memberOnSchoolRepository.getMemberOnSchoolById as jest.Mock
      ).mockResolvedValue({ id: 'm1', schoolId: 'sch1', userId: 'u1' });
      jest
        .spyOn(service, 'validateAccess')
        .mockResolvedValue({ role: 'ADMIN' } as any);
      (
        service.memberOnSchoolRepository
          .getAllMemberOnSchoolsBySchoolId as jest.Mock
      ).mockResolvedValue([{ role: 'ADMIN', userId: 'u1' }]);

      await expect(
        service.deleteMemberOnSchool(
          { memberOnSchoolId: 'm1' } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('claimPendingInvitesForUser', () => {
    const user: any = {
      id: 'user1',
      email: 'invitee@example.com',
      firstName: 'Eve',
      lastName: 'Doe',
      photo: 'p.png',
      phone: '+1234567890',
      blurHash: 'bh',
    };

    it('returns empty array when no pending invites exist', async () => {
      (service as any).memberOnSchoolRepository.findPendingInvitationsForUser =
        jest.fn().mockResolvedValue([]);

      const result = await service.claimPendingInvitesForUser(user);

      expect(result).toEqual([]);
      expect(
        (service as any).memberOnSchoolRepository.updateMemberOnSchool,
      ).not.toHaveBeenCalled();
    });

    it('accepts each pending invite (by userId or email-match) and populates profile fields', async () => {
      const invite1 = {
        id: 'm1',
        schoolId: 'sch1',
        userId: 'user1',
        status: 'PENDDING',
        createAt: new Date('2026-05-20'),
      };
      const invite2 = {
        id: 'm2',
        schoolId: 'sch2',
        userId: null,
        status: 'PENDDING',
        createAt: new Date('2026-05-22'),
      };
      (service as any).memberOnSchoolRepository.findPendingInvitationsForUser =
        jest.fn().mockResolvedValue([invite1, invite2]);
      (service as any).memberOnSchoolRepository.updateMemberOnSchool =
        jest.fn().mockImplementation(async ({ query, data }: any) => ({
          ...((query.id === 'm1') ? invite1 : invite2),
          ...data,
        }));
      // No other school members — prevents the notification pathway from firing
      (service as any).memberOnSchoolRepository.findMany =
        jest.fn().mockResolvedValue([]);

      const result = await service.claimPendingInvitesForUser(user);

      expect(
        (service as any).memberOnSchoolRepository.updateMemberOnSchool,
      ).toHaveBeenCalledTimes(2);
      const firstCall = (service as any).memberOnSchoolRepository
        .updateMemberOnSchool.mock.calls[0][0];
      expect(firstCall).toEqual({
        query: { id: 'm1' },
        data: {
          userId: 'user1',
          status: 'ACCEPT',
          firstName: 'Eve',
          lastName: 'Doe',
          photo: 'p.png',
          phone: '+1234567890',
          blurHash: 'bh',
          invitationToken: null,
          invitationTokenExpiresAt: null,
        },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('getInvitationByToken', () => {
    it('returns invitation details for a valid pending token', async () => {
      (service as any).memberOnSchoolRepository.getMemberOnSchoolByInvitationToken =
        jest.fn().mockResolvedValue({
          id: 'm1',
          email: 'invitee@example.com',
          role: 'TEACHER',
          status: 'PENDDING',
          userId: null,
          schoolId: 'sch1',
          invitationToken: 'good-token',
          invitationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        });
      mockSchoolService.schoolRepository.getSchoolById.mockResolvedValue({
        id: 'sch1',
        title: 'My School',
        logo: 'logo.png',
      });

      const result = await service.getInvitationByToken('good-token');

      expect(result).toEqual({
        email: 'invitee@example.com',
        role: 'TEACHER',
        schoolTitle: 'My School',
        schoolLogo: 'logo.png',
      });
    });

    it('throws NotFoundException for unknown token', async () => {
      (service as any).memberOnSchoolRepository.getMemberOnSchoolByInvitationToken =
        jest.fn().mockResolvedValue(null);

      await expect(service.getInvitationByToken('nope')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for expired token', async () => {
      (service as any).memberOnSchoolRepository.getMemberOnSchoolByInvitationToken =
        jest.fn().mockResolvedValue({
          invitationToken: 'old',
          invitationTokenExpiresAt: new Date('2020-01-01'),
          status: 'PENDDING',
          userId: null,
        });

      await expect(service.getInvitationByToken('old')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException when invitation status is ACCEPT', async () => {
      (service as any).memberOnSchoolRepository.getMemberOnSchoolByInvitationToken =
        jest.fn().mockResolvedValue({
          invitationToken: 'used',
          invitationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
          status: 'ACCEPT',
          userId: 'someone',
        });

      await expect(service.getInvitationByToken('used')).rejects.toThrow(
        ConflictException,
      );
    });

    it('returns invitation details when userId is set but status is still PENDDING (signup happened, verify pending)', async () => {
      (service as any).memberOnSchoolRepository.getMemberOnSchoolByInvitationToken =
        jest.fn().mockResolvedValue({
          id: 'm1',
          email: 'invitee@example.com',
          role: 'TEACHER',
          status: 'PENDDING',
          userId: 'newUser',
          schoolId: 'sch1',
          invitationToken: 'tok',
          invitationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
        });
      mockSchoolService.schoolRepository.getSchoolById.mockResolvedValue({
        id: 'sch1',
        title: 'My School',
        logo: 'logo.png',
      });

      const result = await service.getInvitationByToken('tok');

      expect(result).toEqual({
        email: 'invitee@example.com',
        role: 'TEACHER',
        schoolTitle: 'My School',
        schoolLogo: 'logo.png',
      });
    });
  });
});
