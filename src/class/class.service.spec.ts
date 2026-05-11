import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from './class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../web-push/push.service';
import { StorageService } from '../storage/storage.service';
import { UsersService } from '../users/users.service';
import { SchoolService } from '../school/school.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { RedisService } from '../redis/redis.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('ClassService', () => {
  let service: ClassService;

  const mockPrismaService = {
    class: {
      findMany: jest.fn(),
    },
    memberOnSchool: {
      findMany: jest.fn(),
    },
  };

  const mockMemberOnSchoolService = {
    validateAccess: jest.fn(),
  };

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  const mockPushService = {
    pushRepository: {
      findMany: jest.fn(),
    },
    sendNotification: jest.fn(),
  };

  const mockUsersService = {
    userRepository: {
      findById: jest.fn(),
    },
  };

  const mockSchoolService = {
    schoolRepository: {
      getById: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    ValidateLimit: jest.fn(),
    unlockFeatures: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: MemberOnSchoolService, useValue: mockMemberOnSchoolService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: PushService, useValue: mockPushService },
        { provide: StorageService, useValue: {} },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchoolService, useValue: mockSchoolService },
        { provide: PrismaReadService, useValue: {} },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);

    // mock internal repositories
    (service as any).studentRepository = {
      findByClassId: jest.fn(),
      count: jest.fn(),
    };

    service.classRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      getTotalDeleteSize: jest.fn(),
    } as any;

    (service as any).subjectRepository = {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    };

    (service as any).assignmentRepository = {
      findMany: jest.fn(),
    };

    (service as any).studentOnAssignmentRepository = {
      findMany: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAccess', () => {
    it('should return class if not achieved or deleted', async () => {
      const mockClass = { id: 'c1', isAchieved: false, isDeleted: false };
      (service.classRepository.findById as jest.Mock).mockResolvedValue(
        mockClass,
      );

      const result = await service.validateAccess({ classId: 'c1' });

      expect(result).toEqual(mockClass);
    });

    it('should throw ForbiddenException if class is achieved', async () => {
      const mockClass = { id: 'c1', isAchieved: true, isDeleted: false };
      (service.classRepository.findById as jest.Mock).mockResolvedValue(
        mockClass,
      );

      await expect(service.validateAccess({ classId: 'c1' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if class is deleted', async () => {
      const mockClass = { id: 'c1', isAchieved: false, isDeleted: true };
      (service.classRepository.findById as jest.Mock).mockResolvedValue(
        mockClass,
      );

      await expect(service.validateAccess({ classId: 'c1' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getById', () => {
    it('should return class with students', async () => {
      const mockClass = { id: 'c1', isDeleted: false, schoolId: 's1' };
      (service.classRepository.findById as jest.Mock).mockResolvedValue(
        mockClass,
      );
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service as any).studentRepository.findByClassId.mockResolvedValue([
        { id: 'st1' },
      ]);

      const result = await service.getById({ classId: 'c1' }, {
        id: 'u1',
      } as any);

      expect(result).toEqual({ ...mockClass, students: [{ id: 'st1' }] });
    });

    it('should throw NotFoundException if class not found', async () => {
      (service.classRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getById({ classId: 'c1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createClass', () => {
    it('should create a class', async () => {
      const mockSchool = { id: 's1' };
      mockSchoolService.schoolRepository.getById.mockResolvedValue(mockSchool);
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.classRepository.findMany as jest.Mock).mockResolvedValue([]);
      mockSchoolService.ValidateLimit.mockResolvedValue(true);
      (service.classRepository.create as jest.Mock).mockResolvedValue({
        id: 'c1',
      });

      const result = await service.createClass(
        { schoolId: 's1' } as any,
        { id: 'u1' } as any,
      );

      expect(service.classRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('c1');
    });
  });

  describe('getBySchool', () => {
    it('should return classes with student numbers and creators', async () => {
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      mockPrismaService.class.findMany.mockResolvedValue([
        { id: 'c1', userId: 'u1' },
      ]);
      (service as any).studentRepository.count.mockResolvedValue(5);
      mockUsersService.userRepository.findById.mockResolvedValue({
        id: 'u1',
        name: 'Test',
      });

      const result = await service.getBySchool(
        { schoolId: 's1', isAchieved: false },
        { id: 'u1' } as any,
      );

      expect(result).toEqual([
        {
          id: 'c1',
          userId: 'u1',
          studentNumbers: 5,
          creator: { id: 'u1', name: 'Test' },
        },
      ]);
    });
  });

  describe('reorder', () => {
    it('should reorder classes', async () => {
      (service.classRepository.findById as jest.Mock).mockResolvedValue({
        id: 'c1',
        schoolId: 's1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.classRepository.update as jest.Mock).mockResolvedValue({
        id: 'c1',
        order: 1,
      });

      const result = await service.reorder({ classIds: ['c1'] }, {
        id: 'u1',
      } as any);

      expect(service.classRepository.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { order: 1 },
      });
      expect(result[0].id).toBe('c1');
    });
  });

  describe('update', () => {
    it('should update class', async () => {
      (service.classRepository.findById as jest.Mock).mockResolvedValue({
        id: 'c1',
        schoolId: 's1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (service.classRepository.update as jest.Mock).mockResolvedValue({
        id: 'c1',
        title: 'New Title',
      });

      const result = await service.update(
        { query: { classId: 'c1' }, body: { title: 'New Title' } } as any,
        { id: 'u1' } as any,
      );

      expect(result.title).toBe('New Title');
    });
  });

  describe('delete', () => {
    it('should delete class successfully if admin', async () => {
      (service.classRepository.findById as jest.Mock).mockResolvedValue({
        id: 'c1',
        schoolId: 's1',
        isDeleted: false,
        userId: 'u2',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'ADMIN',
      });

      (service.classRepository.update as jest.Mock).mockResolvedValue({
        id: 'c1',
      });
      (service as any).subjectRepository.updateMany.mockResolvedValue({});
      (
        service.classRepository.getTotalDeleteSize as jest.Mock
      ).mockResolvedValue(100);
      mockSchoolService.schoolRepository.update.mockResolvedValue({});
      (service as any).subjectRepository.findMany.mockResolvedValue([
        { id: 'sub1', isLocked: true },
      ]);
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        limitSubjectNumber: 10,
      });
      mockSchoolService.unlockFeatures.mockResolvedValue({});
      mockPrismaService.memberOnSchool.findMany.mockResolvedValue([]);

      const result = await service.delete({ classId: 'c1' }, {
        id: 'u1',
      } as any);

      expect(service.classRepository.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { isDeleted: true },
      });
      expect(mockSchoolService.schoolRepository.update).toHaveBeenCalled();
      expect(mockSchoolService.unlockFeatures).toHaveBeenCalled();
      expect(result.id).toBe('c1');
    });

    it('should throw ForbiddenException if user is not admin and not creator', async () => {
      (service.classRepository.findById as jest.Mock).mockResolvedValue({
        id: 'c1',
        schoolId: 's1',
        isDeleted: false,
        userId: 'u2',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue({
        role: 'TEACHER',
      });

      await expect(
        service.delete({ classId: 'c1' }, { id: 'u1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getGradeSummaryReport', () => {
    it('should return subjects with student scores', async () => {
      (service.classRepository.findById as jest.Mock).mockResolvedValue({
        id: 'c1',
        schoolId: 's1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);

      const mockSubjects = [{ id: 'sub1' }];
      (service as any).subjectRepository.findMany.mockResolvedValue(
        mockSubjects,
      );

      const mockStudentAssignments = [
        {
          subjectId: 'sub1',
          studentId: 'st1',
          assignmentId: 'a1',
          score: 10,
          title: 'Mr',
          firstName: 'A',
          lastName: 'B',
        },
      ];
      const mockAssignments = [
        { id: 'a1', maxScore: 10, weight: 5, status: 'Published' },
      ];

      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        mockStudentAssignments,
      );
      (service as any).assignmentRepository.findMany.mockResolvedValue(
        mockAssignments,
      );

      const result = await service.getGradeSummaryReport(
        { classId: 'c1', educationYear: '2024' },
        { id: 'u1' } as any,
      );

      expect(result[0].id).toBe('sub1');
      expect(result[0].students[0].totalScore).toBe(5); // (10/10) * 5
    });
  });
});
