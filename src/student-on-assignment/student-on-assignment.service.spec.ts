import { Test, TestingModule } from '@nestjs/testing';
import { StudentOnAssignmentService } from './student-on-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { PushService } from '../web-push/push.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { NotificationService } from '../notification/notification.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
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

describe('StudentOnAssignmentService', () => {
  let service: StudentOnAssignmentService;

  const mockPrismaService = {
    fileOnStudentAssignment: { findMany: jest.fn() },
    subject: { findUnique: jest.fn() },
    school: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockNotificationService = {
    createNotifications: jest.fn(),
  };

  const mockLineBotService = {
    sendMessage: jest.fn(),
  };

  const mockSkillOnStudentAssignmentService = {
    suggestCreate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentOnAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: {} },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: PushService, useValue: {} },
        {
          provide: SkillOnStudentAssignmentService,
          useValue: mockSkillOnStudentAssignmentService,
        },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LineBotService, useValue: mockLineBotService },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<StudentOnAssignmentService>(
      StudentOnAssignmentService,
    );

    service.studentOnAssignmentRepository = {
      getById: jest.fn(),
      getByAssignmentId: jest.fn(),
      getByStudentId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    } as any;

    (service as any).assignmentRepository = {
      getById: jest.fn(),
    };

    (service as any).teacherOnSubjectRepository = {
      getByTeacherIdAndSubjectId: jest.fn(),
      findMany: jest.fn(),
    };

    (service as any).memberOnSchoolRepository = {
      getMemberOnSchoolByUserIdAndSchoolId: jest.fn(),
    };

    (service as any).studentRepository = {
      findById: jest.fn(),
    };

    (service as any).studentOnSubjectRepository = {
      getStudentOnSubjectById: jest.fn(),
    };

    (service as any).fileOnStudentAssignmentRepository = {
      findMany: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getById', () => {
    it('should return student on assignment', async () => {
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', studentId: 'st1' });

      const result = await service.getById({ id: 'sa1' }, { id: 'st1' } as any);
      expect(result.id).toBe('sa1');
    });

    it('should throw NotFoundException if not found', async () => {
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(null);

      await expect(service.getById({ id: 'sa1' }, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if student mismatch', async () => {
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', studentId: 'st1' });

      await expect(
        service.getById({ id: 'sa1' }, { id: 'st2' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getByAssignmentId', () => {
    it('should return student on assignments with files', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1' },
      );
      (
        service as any
      ).memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId.mockResolvedValue(
        { role: 'TEACHER' },
      );
      (
        service.studentOnAssignmentRepository.getByAssignmentId as jest.Mock
      ).mockResolvedValue([{ id: 'sa1' }]);
      mockPrismaService.fileOnStudentAssignment.findMany.mockResolvedValue([
        { id: 'f1', studentOnAssignmentId: 'sa1' },
      ]);

      const result = await service.getByAssignmentId({ assignmentId: 'a1' }, {
        id: 'u1',
      } as any);

      expect(result[0].id).toBe('sa1');
      expect(result[0].files[0].id).toBe('f1');
    });
  });

  describe('create', () => {
    it('should create student on assignment', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
      });
      (
        service as any
      ).studentOnSubjectRepository.getStudentOnSubjectById.mockResolvedValue({
        id: 'sos1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1' },
      );
      (
        service as any
      ).memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId.mockResolvedValue(
        { role: 'TEACHER' },
      );
      (
        service.studentOnAssignmentRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'sa1' });

      const result = await service.create(
        { assignmentId: 'a1', studentOnSubjectId: 'sos1' },
        { id: 'u1' } as any,
      );

      expect(service.studentOnAssignmentRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('sa1');
    });
  });

  describe('update', () => {
    it('should update student on assignment (Teacher)', async () => {
      const dto: any = {
        query: { studentOnAssignmentId: 'sa1' },
        body: { score: 5, status: 'REVIEWD' },
      };
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', assignmentId: 'a1', subjectId: 's1' });
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        maxScore: 10,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service.studentOnAssignmentRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'sa1', score: 5 });
      mockSkillOnStudentAssignmentService.suggestCreate.mockResolvedValue([]);

      const result = await service.update(dto, { id: 'u1' } as any);

      expect(service.studentOnAssignmentRepository.update).toHaveBeenCalled();
      expect(
        mockSkillOnStudentAssignmentService.suggestCreate,
      ).toHaveBeenCalled();
      expect(result.id).toBe('sa1');
    });

    it('should notify line bot when student submits', async () => {
      const dto: any = {
        query: { studentOnAssignmentId: 'sa1' },
        body: { status: 'SUBMITTED' },
      };
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({
        id: 'sa1',
        assignmentId: 'a1',
        subjectId: 's1',
        studentId: 'st1',
        isAssigned: true,
      });
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        maxScore: 10,
        type: 'Assignment',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
        isVerifyLine: true,
        lineGroupId: 'g1',
        allowSendNotificationOnStudentOnAssignmentToLine: true,
      });
      mockPrismaService.school.findUnique.mockResolvedValue({
        plan: 'PREMIUM',
      });
      (service as any).teacherOnSubjectRepository.findMany.mockResolvedValue([
        { userId: 'u1' },
      ]);
      (
        service.studentOnAssignmentRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'sa1' }]);
      (
        service.studentOnAssignmentRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'sa1', status: 'SUBMITTED' });

      await service.update(dto, undefined, { id: 'st1' } as any);

      expect(mockNotificationService.createNotifications).toHaveBeenCalled();
      expect(mockLineBotService.sendMessage).toHaveBeenCalled();
    });

    it('should throw BadRequestException if score exceeds max', async () => {
      const dto: any = {
        query: { studentOnAssignmentId: 'sa1' },
        body: { score: 15 },
      };
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', assignmentId: 'a1' });
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        maxScore: 10,
      });

      await expect(service.update(dto, { id: 'u1' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete student on assignment if allowed', async () => {
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', subjectId: 's1', schoolId: 'sch1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1' },
      );
      (
        service as any
      ).memberOnSchoolRepository.getMemberOnSchoolByUserIdAndSchoolId.mockResolvedValue(
        { role: 'TEACHER' },
      );
      (
        service.studentOnAssignmentRepository.delete as jest.Mock
      ).mockResolvedValue({ message: 'Deleted' });

      const result = await service.delete({ studentOnAssignmentId: 'sa1' }, {
        id: 'u1',
      } as any);

      expect(service.studentOnAssignmentRepository.delete).toHaveBeenCalledWith(
        { studentOnAssignmentId: 'sa1' },
      );
      expect(result.message).toBe('Deleted');
    });
  });
});
