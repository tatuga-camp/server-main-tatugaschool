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
});
