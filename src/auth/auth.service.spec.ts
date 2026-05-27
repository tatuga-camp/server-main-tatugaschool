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
import {
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

  beforeEach(async () => {
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
      expect(result).toEqual({
        redirectUrl: `${process.env.CLIENT_URL}/auth/wait-verify-email`,
        token: 'verify-token',
      });
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
      expect(result).toEqual({
        redirectUrl: process.env.CLIENT_URL,
        refreshToken: 'token',
        accessToken: 'token',
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
      mockPrismaService.memberOnSchool.findMany.mockResolvedValue([]);
      mockSchoolService.createSchool.mockResolvedValue({ id: 'defaultSch' });

      const result = await service.verifyEmail({ token: 'vtok' });

      expect(service.usersRepository.updateVerified).toHaveBeenCalledWith({
        email: 'invitee@example.com',
      });
      expect(mockSchoolService.createSchool).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'defaultSch' });
    });

    it('skips default school creation when the user already has memberships', async () => {
      mockPrismaService.memberOnSchool.findMany.mockResolvedValue([
        { id: 'm1', schoolId: 'sch1' },
      ]);

      const result = await service.verifyEmail({ token: 'vtok' });

      expect(mockSchoolService.createSchool).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
