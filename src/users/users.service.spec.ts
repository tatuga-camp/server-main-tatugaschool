jest.mock('../member-on-school/member-on-school.raw');
import { findFirstMemberOnSchoolByUser } from '../member-on-school/member-on-school.raw';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('newHashedPassword'),
}));

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: { findUnique: jest.fn() },
    memberOnSchool: { findFirst: jest.fn() },
    memberOnTeam: { findFirst: jest.fn() },
  };

  const mockAuthService = {
    sendVerifyEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    service.userRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      findManyVerifiedByEmailPrefix: jest.fn(),
      update: jest.fn(),
      findActiveRecipients: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetUser', () => {
    it('should return user without sensitive fields', async () => {
      (service.userRepository.findById as jest.Mock).mockResolvedValue({
        id: 'u1',
        password: 'abc',
        resetPasswordToken: 't1',
        verifyEmailToken: 't2',
      });

      const result = await service.GetUser({ id: 'u1' } as any);

      expect(result.password).toBeUndefined();
      expect(result.resetPasswordToken).toBeUndefined();
      expect(result.verifyEmailToken).toBeUndefined();
      expect(result.id).toBe('u1');
    });
  });

  describe('ResendVerifyEmail', () => {
    it('should throw BadRequestException if requested too soon', async () => {
      service.userRepository.findById = jest.fn().mockResolvedValue({
        id: 'u1',
        updateAt: new Date(Date.now() - 30000), // 30 seconds ago
      });
      await expect(
        service.ResendVerifyEmail({
          id: 'u1',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send email if allowed', async () => {
      service.userRepository.findById = jest.fn().mockResolvedValue({
        id: 'u1',
        updateAt: new Date(Date.now() - 120000),
      });
      await service.ResendVerifyEmail({
        id: 'u1',
      } as any);

      expect(mockAuthService.sendVerifyEmail).toHaveBeenCalled();
    });
  });

  describe('GetUserByEmail', () => {
    it('should return verified users matching email via the raw prefix search', async () => {
      (
        service.userRepository.findManyVerifiedByEmailPrefix as jest.Mock
      ).mockResolvedValue([
        {
          email: 'test@example.com',
          password: 'xxx',
          resetPasswordToken: 'r',
          verifyEmailToken: 'v',
        },
      ]);

      const result = await service.GetUserByEmail({ email: 'test' });

      expect(
        service.userRepository.findManyVerifiedByEmailPrefix,
      ).toHaveBeenCalledWith({ email: 'test', limit: 5 });
      // The old Prisma `contains` path compiled to a full-collection $expr
      // scan — the service must not fall back to findMany for this search.
      expect(service.userRepository.findMany).not.toHaveBeenCalled();
      expect(result[0].email).toBe('test@example.com');
      expect(result[0].password).toBeUndefined();
      expect(result[0].resetPasswordToken).toBeUndefined();
      expect(result[0].verifyEmailToken).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('should update user and require re-verification if email changed', async () => {
      const dto: any = { email: 'new@example.com' };
      const mockUser = {
        id: 'u1',
        email: 'old@example.com',
        provider: 'LOCAL',
      };

      service.userRepository.findById = jest.fn().mockResolvedValue(mockUser);
      (service.userRepository.update as jest.Mock).mockResolvedValue({
        id: 'u1',
        email: 'new@example.com',
      });

      const result = await service.updateUser(dto, mockUser as any);

      expect(service.userRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isVerifyEmail: false }),
        }),
      );
      expect(mockAuthService.sendVerifyEmail).toHaveBeenCalled();
      expect(result.email).toBe('new@example.com');
    });

    it('should throw BadRequestException if photo lacks blurHash', async () => {
      await expect(
        service.updateUser({ photo: 'pic.jpg' } as any, {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if email unchanged', async () => {
      await expect(
        service.updateUser(
          { email: 'same@example.com' } as any,
          { email: 'same@example.com' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updatePassword', () => {
    it('should update password if current is valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        password: 'oldHashedPassword',
      });
      (service.userRepository.update as jest.Mock).mockResolvedValue({
        id: 'u1',
        password: 'newHashedPassword',
      });

      const result = await service.updatePassword(
        { currentPassword: 'old', newPassword: 'new' },
        { id: 'u1' } as any,
      );

      expect(bcrypt.compare).toHaveBeenCalledWith('old', 'oldHashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('new', 10);
      expect(result.password).toBe('newHashedPassword');
    });
  });

  describe('isAdminOfSchool', () => {
    it('should return member if admin', async () => {
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue({
        role: 'ADMIN',
      });

      const result = await service.isAdminOfSchool('u1', 'sch1');

      expect(result.role).toBe('ADMIN');
    });

    it('should throw ForbiddenException if not admin', async () => {
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue({
        role: 'TEACHER',
      });

      await expect(service.isAdminOfSchool('u1', 'sch1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('isMemberOfSchool', () => {
    it('should return member if belongs to school', async () => {
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue({
        role: 'TEACHER',
      });

      const result = await service.isMemberOfSchool('u1', 'sch1');

      expect(result.role).toBe('TEACHER');
    });
  });

  describe('GetTawkHash', () => {
    afterEach(() => {
      delete process.env.TAWK_API_KEY;
    });

    it('returns userId and hex HMAC-SHA256 of user id keyed with TAWK_API_KEY', () => {
      process.env.TAWK_API_KEY = 'test-key';
      const user = { id: '507f1f77bcf86cd799439011' } as any;

      const result = service.GetTawkHash(user);

      const expected = crypto
        .createHmac('sha256', 'test-key')
        .update('507f1f77bcf86cd799439011')
        .digest('hex');
      expect(result).toEqual({
        userId: '507f1f77bcf86cd799439011',
        hash: expected,
      });
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('throws InternalServerErrorException when TAWK_API_KEY is not configured', () => {
      delete process.env.TAWK_API_KEY;
      const user = { id: 'abc' } as any;

      expect(() => service.GetTawkHash(user)).toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findActiveRecipients', () => {
    it('delegates to userRepository with the same threshold', async () => {
      const spy = jest
        .spyOn(service.userRepository, 'findActiveRecipients')
        .mockResolvedValue([{ email: 'x@y.com', language: 'en' }]);
      const result = await service.findActiveRecipients(7);
      expect(spy).toHaveBeenCalledWith(7);
      expect(result).toEqual([{ email: 'x@y.com', language: 'en' }]);
    });
  });
});
