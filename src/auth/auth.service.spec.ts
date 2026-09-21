jest.mock('../member-on-school/member-on-school.raw');
import { findManyMemberOnSchoolByUser } from '../member-on-school/member-on-school.raw';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';
import { JwtService } from '@nestjs/jwt';
import { ImageService } from '../image/image.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SchoolService } from '../school/school.service';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { TurnstileService } from '../turnstile/turnstile.service';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
          getAccessToken: jest
            .fn()
            .mockResolvedValue({ token: 'mock-google-token' }),
        }),
      })),
    },
  },
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockImageService = {
    generateBase64Image: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_CLOUD_PRIVATE_KEY_ENCODE')
        return Buffer.from('mockKey').toString('base64');
      if (key === 'NODE_ENV') return 'test';
      return 'mock-value';
    }),
  };

  const mockPrismaService = {
    memberOnSchool: {
      findMany: jest.fn(),
    },
  };

  const mockSchoolService = {
    createSchool: jest.fn(),
  };

  const mockTurnstileService = {
    verify: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    mockTurnstileService.verify.mockReset().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: EmailService, useValue: mockEmailService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ImageService, useValue: mockImageService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: {} },
        { provide: SchoolService, useValue: mockSchoolService },
        { provide: TurnstileService, useValue: mockTurnstileService },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
        {
          provide: MemberOnSchoolService,
          useValue: {
            getInvitationByToken: jest.fn(),
            linkInvitationToUser: jest.fn(),
            memberOnSchoolRepository: {
              getMemberOnSchoolByInvitationToken: jest.fn(),
              updateMemberOnSchool: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Mock internal repositories
    service.usersRepository = {
      findByEmail: jest.fn(),
      updateResetToken: jest.fn(),
      createUser: jest.fn(),
      findByVerifyToken: jest.fn(),
      updateVerified: jest.fn(),
      findByResetToken: jest.fn(),
      updatePassword: jest.fn(),
      updateLastActiveAt: jest.fn(),
      update: jest.fn(),
    } as any;

    service.studentRepository = {
      findById: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('should send reset password email successfully', async () => {
      const mockUser = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        isDeleted: false,
        isVerifyEmail: true,
        updateAt: new Date(Date.now() - 120000), // Updated 2 minutes ago
        provider: 'LOCAL',
      };

      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue(
        mockUser,
      );
      (service.usersRepository.updateResetToken as jest.Mock).mockResolvedValue(
        {},
      );
      mockEmailService.sendMail.mockResolvedValue({});

      await service.forgotPassword({ email: 'test@example.com' });

      expect(service.usersRepository.updateResetToken).toHaveBeenCalled();
      expect(mockEmailService.sendMail).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.forgotPassword({ email: 'test@example.com' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('googleLogin', () => {
    const req = {
      user: {
        email: 'g@example.com',
        firstName: 'G',
        lastName: 'U',
        providerId: 'p1',
        photo: '',
      },
    } as any;

    const parseRedirect = (reply: any) => {
      expect(reply.redirect).toHaveBeenCalledTimes(1);
      const [url, status] = reply.redirect.mock.calls[0];
      expect(status).toBe(302);
      const [base, hash] = (url as string).split('#');
      return { base, params: new URLSearchParams(hash ?? '') };
    };

    it('sends verified Google users to the app callback with tokens in the URL fragment', async () => {
      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: 'u1',
        email: 'g@example.com',
        provider: 'GOOGLE',
        isVerifyEmail: true,
        favoritSchool: 'sch-1',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-1')
        .mockResolvedValueOnce('refresh-1');
      const reply = { setCookie: jest.fn(), redirect: jest.fn() } as any;

      await service.googleLogin(req, reply);

      expect(reply.setCookie).toHaveBeenCalledTimes(2);
      const { base, params } = parseRedirect(reply);
      expect(base).toBe(`${process.env.CLIENT_URL}/auth/callback`);
      expect(params.get('access_token')).toBe('access-1');
      expect(params.get('refresh_token')).toBe('refresh-1');
      expect(params.get('next')).toBe('/school/sch-1');
    });

    it('sends unverified Google users to the callback with next=wait-verify-email', async () => {
      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: 'u2',
        email: 'g@example.com',
        provider: 'GOOGLE',
        isVerifyEmail: false,
        favoritSchool: null,
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-2')
        .mockResolvedValueOnce('refresh-2');
      const reply = { setCookie: jest.fn(), redirect: jest.fn() } as any;

      await service.googleLogin(req, reply);

      const { base, params } = parseRedirect(reply);
      expect(base).toBe(`${process.env.CLIENT_URL}/auth/callback`);
      expect(params.get('refresh_token')).toBe('refresh-2');
      expect(params.get('next')).toBe('/auth/wait-verify-email');
    });

    it('keeps the plain sign-in redirect (no tokens) for non-Google accounts', async () => {
      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: 'u3',
        email: 'g@example.com',
        provider: 'LOCAL',
        isVerifyEmail: true,
      });
      const reply = { setCookie: jest.fn(), redirect: jest.fn() } as any;

      await service.googleLogin(req, reply);

      expect(reply.setCookie).not.toHaveBeenCalled();
      const [url] = reply.redirect.mock.calls[0];
      expect(url).toContain('/auth/sign-in?error=');
      expect(url).not.toContain('refresh_token');
    });
  });

  describe('signup', () => {
    it('should sign up a user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        provider: 'LOCAL',
        firstName: 'John',
        lastName: 'Doe',
      } as any;
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        firstName: 'John',
        isVerifyEmail: false,
      };

      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue(
        null,
      );
      mockImageService.generateBase64Image.mockReturnValue('base64image');
      (service.usersRepository.createUser as jest.Mock).mockResolvedValue(
        mockUser,
      );
      mockJwtService.signAsync.mockResolvedValue('token');

      jest
        .spyOn(service, 'sendVerifyEmail')
        .mockResolvedValue({ token: 'verify-token' });

      const mockReply = {
        setCookie: jest.fn(),
      } as any;

      const result = await service.signup(dto, mockReply);

      expect(service.usersRepository.createUser).toHaveBeenCalled();
      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync.mock.calls[0][0]).toEqual({
        id: 'u1',
        email: 'test@example.com',
        isVerifyEmail: false,
      });
      expect(result).toEqual({
        redirectUrl: `${process.env.CLIENT_URL}/auth/wait-verify-email`,
        token: 'verify-token',
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    it('issues the access token after auto-verifying via pending invitations', async () => {
      const dto = {
        email: 'invited@example.com',
        password: 'password123',
        provider: 'LOCAL',
        firstName: 'Ann',
        lastName: 'Lee',
      } as any;

      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue(
        null,
      );
      mockImageService.generateBase64Image.mockReturnValue('base64image');
      (service.usersRepository.createUser as jest.Mock).mockResolvedValue({
        id: 'u2',
        email: 'invited@example.com',
        isVerifyEmail: false,
      });
      (service.usersRepository.update as jest.Mock).mockResolvedValue({
        id: 'u2',
        email: 'invited@example.com',
        isVerifyEmail: true,
        favoritSchool: 'sch-1',
      });
      const memberSvc = (service as any).memberOnSchoolService;
      memberSvc.memberOnSchoolRepository.findMany.mockResolvedValue([
        { invitationToken: 'inv-tok', schoolId: 'sch-1' },
      ]);
      memberSvc.linkInvitationToUser.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('token');
      jest
        .spyOn(service, 'sendVerifyEmail')
        .mockResolvedValue({ token: 'verify-token' });

      const mockReply = { setCookie: jest.fn() } as any;
      const result = await service.signup(dto, mockReply);

      expect(service.usersRepository.updateVerified).toHaveBeenCalledWith({
        email: 'invited@example.com',
      });
      expect(mockJwtService.signAsync.mock.calls[0][0]).toEqual({
        id: 'u2',
        email: 'invited@example.com',
        isVerifyEmail: true,
      });
      expect(service.sendVerifyEmail).not.toHaveBeenCalled();
      expect(result).toEqual({
        redirectUrl: `${process.env.CLIENT_URL}/school/sch-1`,
        accessToken: 'token',
        refreshToken: 'token',
      });
    });

    it('verifies the Turnstile token before looking up the email', async () => {
      const order: string[] = [];
      mockTurnstileService.verify.mockImplementation(async () => {
        order.push('verify');
      });
      (service.usersRepository.findByEmail as jest.Mock).mockImplementation(
        async () => {
          order.push('findByEmail');
          return null;
        },
      );
      mockImageService.generateBase64Image.mockReturnValue('img');
      (service.usersRepository.createUser as jest.Mock).mockResolvedValue({
        id: 'u3',
        email: 'x@example.com',
        isVerifyEmail: false,
      });
      mockJwtService.signAsync.mockResolvedValue('token');
      jest
        .spyOn(service, 'sendVerifyEmail')
        .mockResolvedValue({ token: 'verify-token' });

      await service.signup(
        {
          email: 'x@example.com',
          password: 'password123',
          provider: 'LOCAL',
          firstName: 'A',
          lastName: 'B',
          turnstileToken: 'cf-token',
        } as any,
        { setCookie: jest.fn() } as any,
      );

      expect(mockTurnstileService.verify).toHaveBeenCalledWith('cf-token');
      expect(order).toEqual(['verify', 'findByEmail']);
    });

    it('rejects the sign-up and creates nothing when Turnstile verification fails', async () => {
      mockTurnstileService.verify.mockRejectedValue(
        new BadRequestException('Turnstile verification failed'),
      );

      await expect(
        service.signup(
          {
            email: 'x@example.com',
            password: 'password123',
            provider: 'LOCAL',
            firstName: 'A',
            lastName: 'B',
            turnstileToken: 'bad',
          } as any,
          { setCookie: jest.fn() } as any,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(service.usersRepository.findByEmail).not.toHaveBeenCalled();
      expect(service.usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('also verifies the Turnstile token for GOOGLE sign-ups', async () => {
      mockTurnstileService.verify.mockRejectedValue(
        new BadRequestException('Turnstile verification failed'),
      );

      await expect(
        service.signup(
          {
            email: 'g@example.com',
            provider: 'GOOGLE',
            providerId: 'gid',
            firstName: 'A',
            lastName: 'B',
            turnstileToken: 'bad',
          } as any,
          { setCookie: jest.fn() } as any,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockTurnstileService.verify).toHaveBeenCalledWith('bad');
      expect(service.usersRepository.createUser).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: 'u1',
      });

      await expect(
        service.signup({ email: 'test@example.com' } as any, {} as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const mockUser = {
        id: 'u1',
        email: 'test@example.com',
        provider: 'LOCAL',
        password: await bcrypt.hash('password123', 10),
        isVerifyEmail: true,
      };

      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue(
        mockUser,
      );
      mockJwtService.signAsync.mockResolvedValue('token');
      (
        service.usersRepository.updateLastActiveAt as jest.Mock
      ).mockResolvedValue({});

      const mockReply = {
        setCookie: jest.fn(),
      } as any;

      const result = await service.signIn(
        { email: 'test@example.com', password: 'password123' },
        mockReply,
      );

      expect(mockReply.setCookie).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync.mock.calls[0][0]).toEqual({
        id: 'u1',
        email: 'test@example.com',
        isVerifyEmail: true,
      });
      expect(result).toEqual({
        redirectUrl: process.env.CLIENT_URL,
        refreshToken: 'token',
        accessToken: 'token',
      });
    });

    it('issues an access token carrying isVerifyEmail=false for an unverified user', async () => {
      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        provider: 'LOCAL',
        password: await bcrypt.hash('password123', 10),
        isVerifyEmail: false,
      });
      mockJwtService.signAsync.mockResolvedValue('token');
      (
        service.usersRepository.updateLastActiveAt as jest.Mock
      ).mockResolvedValue({});

      const result = await service.signIn(
        { email: 'test@example.com', password: 'password123' },
        { setCookie: jest.fn() } as any,
      );

      expect(mockJwtService.signAsync.mock.calls[0][0]).toEqual({
        id: 'u1',
        email: 'test@example.com',
        isVerifyEmail: false,
      });
      expect(result).toEqual({
        redirectUrl: `${process.env.CLIENT_URL}/auth/wait-verify-email`,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      (service.usersRepository.findByEmail as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.signIn(
          { email: 'test@example.com', password: 'password123' },
          {} as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('UserRefreshToken', () => {
    it('re-reads isVerifyEmail from the database and puts it in the new access token', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
      });
      service.usersRepository.findById = jest.fn().mockResolvedValue({
        id: 'u1',
        email: 'test@example.com',
        isVerifyEmail: true,
      });
      mockJwtService.signAsync.mockResolvedValue('new-access');

      const result = await service.UserRefreshToken(
        { refreshToken: 'refresh' },
        {} as any,
      );

      expect(service.usersRepository.findById).toHaveBeenCalledWith({
        id: 'u1',
      });
      expect(mockJwtService.signAsync.mock.calls[0][0]).toEqual({
        id: 'u1',
        email: 'test@example.com',
        isVerifyEmail: true,
      });
      expect(result).toEqual({ accessToken: 'new-access' });
    });

    it('rejects when the refresh token belongs to a user that no longer exists', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        id: 'gone',
        email: 'gone@example.com',
      });
      service.usersRepository.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.UserRefreshToken({ refreshToken: 'refresh' }, {} as any),
      ).rejects.toThrow(BadRequestException);
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('rejects an invalid or expired refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(
        service.UserRefreshToken({ refreshToken: 'bad' }, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('signup with invitationToken', () => {
    const baseDto = {
      email: 'invitee@example.com',
      password: 'password123',
      firstName: 'Eve',
      lastName: 'Doe',
      phone: '+1234567890',
      provider: 'LOCAL' as any,
    };
    const reply: any = { setCookie: jest.fn() };

    beforeEach(() => {
      service.usersRepository.findByEmail = jest.fn().mockResolvedValue(null);
      service.usersRepository.createUser = jest
        .fn()
        .mockResolvedValue({ id: 'newUser', email: 'invitee@example.com' });
      service.usersRepository.updateVerified = jest.fn().mockResolvedValue({});
      service.usersRepository.update = jest.fn().mockResolvedValue({
        id: 'newUser',
        email: 'invitee@example.com',
        favoritSchool: 'sch-invited',
      });
      mockJwtService.signAsync.mockResolvedValue('jwt');
      mockImageService.generateBase64Image.mockReturnValue('photo');
      jest
        .spyOn(service, 'sendVerifyEmail')
        .mockResolvedValue({ token: 'verify-token' });
    });

    it('auto-verifies, sets favoritSchool, and redirects to /school/:id when token is valid', async () => {
      const memberSvc = (service as any).memberOnSchoolService;
      memberSvc.linkInvitationToUser.mockResolvedValue({
        id: 'inv1',
        schoolId: 'sch-invited',
        email: 'invitee@example.com',
      });

      const result = await service.signup(
        { ...baseDto, invitationToken: 'tok' } as any,
        reply,
      );

      expect(memberSvc.linkInvitationToUser).toHaveBeenCalledWith({
        token: 'tok',
        userId: 'newUser',
        email: 'invitee@example.com',
      });
      expect(service.usersRepository.updateVerified).toHaveBeenCalledWith({
        email: 'invitee@example.com',
      });
      expect(service.usersRepository.update).toHaveBeenCalledWith({
        where: { id: 'newUser' },
        data: { favoritSchool: 'sch-invited' },
      });
      expect(service.sendVerifyEmail).not.toHaveBeenCalled();
      expect(reply.setCookie).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        redirectUrl: `${process.env.CLIENT_URL}/school/sch-invited`,
        accessToken: 'jwt',
        refreshToken: 'jwt',
      });
    });

    it('propagates ForbiddenException when invitation email does not match signup email', async () => {
      const memberSvc = (service as any).memberOnSchoolService;
      memberSvc.linkInvitationToUser.mockRejectedValue(
        new ForbiddenException('Email does not match invitation'),
      );

      await expect(
        service.signup({ ...baseDto, invitationToken: 'tok' } as any, reply),
      ).rejects.toThrow(ForbiddenException);
      expect(service.usersRepository.updateVerified).not.toHaveBeenCalled();
      expect(service.sendVerifyEmail).not.toHaveBeenCalled();
    });

    it('propagates NotFoundException when invitation token is unknown', async () => {
      const memberSvc = (service as any).memberOnSchoolService;
      memberSvc.linkInvitationToUser.mockRejectedValue(
        new NotFoundException('Invitation not found'),
      );

      await expect(
        service.signup({ ...baseDto, invitationToken: 'bogus' } as any, reply),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates ForbiddenException when invitation token is expired', async () => {
      const memberSvc = (service as any).memberOnSchoolService;
      memberSvc.linkInvitationToUser.mockRejectedValue(
        new ForbiddenException('Invitation expired'),
      );

      await expect(
        service.signup(
          { ...baseDto, invitationToken: 'expired' } as any,
          reply,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyEmail', () => {
    beforeEach(() => {
      service.usersRepository.findByVerifyToken = jest.fn().mockResolvedValue({
        id: 'user1',
        email: 'invitee@example.com',
        firstName: 'Eve',
        lastName: 'Doe',
        photo: 'p.png',
        phone: '+1',
        blurHash: 'b',
        verifyEmailTokenExpiresAt: new Date(Date.now() + 60_000),
      });
      service.usersRepository.updateVerified = jest.fn().mockResolvedValue({});
    });

    it('creates the default school when the user has no existing memberships', async () => {
      (findManyMemberOnSchoolByUser as jest.Mock).mockResolvedValue([]);
      mockSchoolService.createSchool.mockResolvedValue({ id: 'defaultSch' });

      const result = await service.verifyEmail({ token: 'vtok' });

      expect(service.usersRepository.updateVerified).toHaveBeenCalledWith({
        email: 'invitee@example.com',
      });
      expect(mockSchoolService.createSchool).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'defaultSch' });
    });

    it('skips default school creation when the user already has memberships', async () => {
      (findManyMemberOnSchoolByUser as jest.Mock).mockResolvedValue([
        { id: 'm1', schoolId: 'sch1' },
      ]);

      const result = await service.verifyEmail({ token: 'vtok' });

      expect(mockSchoolService.createSchool).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
