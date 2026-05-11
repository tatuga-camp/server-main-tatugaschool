import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

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
      update: jest.fn(),
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
      await expect(
        service.ResendVerifyEmail({
          updateAt: new Date(Date.now() - 30000),
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should send email if allowed', async () => {
      await service.ResendVerifyEmail({
        updateAt: new Date(Date.now() - 120000),
      } as any);

      expect(mockAuthService.sendVerifyEmail).toHaveBeenCalled();
    });
  });

  describe('GetUserByEmail', () => {
    it('should return verified users matching email', async () => {
      (service.userRepository.findMany as jest.Mock).mockResolvedValue([
        { email: 'test@example.com', password: 'xxx' },
      ]);

      const result = await service.GetUserByEmail({ email: 'test' });

      expect(result[0].email).toBe('test@example.com');
      expect(result[0].password).toBeUndefined();
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
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        role: 'ADMIN',
      });

      const result = await service.isAdminOfSchool('u1', 'sch1');

      expect(result.role).toBe('ADMIN');
    });

    it('should throw ForbiddenException if not admin', async () => {
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        role: 'TEACHER',
      });

      await expect(service.isAdminOfSchool('u1', 'sch1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('isMemberOfSchool', () => {
    it('should return member if belongs to school', async () => {
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        role: 'TEACHER',
      });

      const result = await service.isMemberOfSchool('u1', 'sch1');

      expect(result.role).toBe('TEACHER');
    });
  });
});
