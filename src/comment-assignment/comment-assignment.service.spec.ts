import { Test, TestingModule } from '@nestjs/testing';
import { CommentAssignmentService } from './comment-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('CommentAssignmentService', () => {
  let service: CommentAssignmentService;

  const mockPrismaService = {
    subject: {
      findUnique: jest.fn(),
    },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
    teacherOnSubjectRepository: {
      getManyBySubjectId: jest.fn(),
      getByTeacherIdAndSubjectId: jest.fn(),
    },
  };

  const mockNotificationService = {
    createNotifications: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<CommentAssignmentService>(CommentAssignmentService);

    service.commentAssignmentRepository = {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getById: jest.fn(),
    } as any;

    service.studentOnAssignmentRepository = {
      getById: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByStudentOnAssignment', () => {
    it('should return comments', async () => {
      const mockStudentOnAssignment = {
        id: 'sa1',
        subjectId: 's1',
        studentId: 'st1',
      };
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(mockStudentOnAssignment);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.commentAssignmentRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'c1' }]);

      const result = await service.getByStudentOnAssignment(
        { studentOnAssignmentId: 'sa1' },
        { id: 'u1' } as any,
        { id: 'st1' } as any,
      );

      expect(service.commentAssignmentRepository.findMany).toHaveBeenCalledWith(
        { where: { studentOnAssignmentId: 'sa1' } },
      );
      expect(result[0].id).toBe('c1');
    });

    it('should throw ForbiddenException if student ids mismatch', async () => {
      const mockStudentOnAssignment = {
        id: 'sa1',
        subjectId: 's1',
        studentId: 'st1',
      };
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(mockStudentOnAssignment);

      await expect(
        service.getByStudentOnAssignment(
          { studentOnAssignmentId: 'sa1' },
          null,
          { id: 'st2' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createFromStudent', () => {
    it('should create comment and notify teachers', async () => {
      const mockStudentOnAssignment = {
        id: 'sa1',
        subjectId: 's1',
        assignmentId: 'a1',
      };
      const mockStudent = {
        id: 'st1',
        firstName: 'John',
        lastName: 'Doe',
        photo: 'pic.jpg',
        schoolId: 'sch1',
      };

      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(mockStudentOnAssignment);
      (
        service.commentAssignmentRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'c1' });
      mockTeacherOnSubjectService.teacherOnSubjectRepository.getManyBySubjectId.mockResolvedValue(
        [{ userId: 'u1' }],
      );

      const result = await service.createFromStudent(
        { studentOnAssignmentId: 'sa1' } as any,
        mockStudent as any,
      );

      expect(service.commentAssignmentRepository.create).toHaveBeenCalled();
      expect(mockNotificationService.createNotifications).toHaveBeenCalled();
      expect(result.id).toBe('c1');
    });
  });

  describe('createFromTeacher', () => {
    it('should create comment from teacher', async () => {
      const mockStudentOnAssignment = { id: 'sa1', subjectId: 's1' };
      const mockTeacher = {
        id: 't1',
        subjectId: 's1',
        schoolId: 'sch1',
        role: 'TEACHER',
      };
      const mockUser = {
        id: 'u1',
        firstName: 'Jane',
        lastName: 'Doe',
        photo: 'pic.jpg',
        email: 'test@example.com',
      };

      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(mockStudentOnAssignment);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockTeacherOnSubjectService.teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        mockTeacher,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue({
        isLocked: false,
      });
      (
        service.commentAssignmentRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'c1' });

      const result = await service.createFromTeacher(
        { studentOnAssignmentId: 'sa1' } as any,
        mockUser as any,
      );

      expect(service.commentAssignmentRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('c1');
    });

    it('should throw ForbiddenException if teacher is not in subject', async () => {
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ subjectId: 's1' });
      mockTeacherOnSubjectService.teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        null,
      );

      await expect(
        service.createFromTeacher({} as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateFromStudent', () => {
    it('should update comment if correct student', async () => {
      (
        service.commentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ studentId: 'st1' });
      (
        service.commentAssignmentRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'c1' });

      const result = await service.updateFromStudent(
        { query: { commentOnAssignmentId: 'c1' } } as any,
        { id: 'st1' } as any,
      );

      expect(result.id).toBe('c1');
    });

    it('should throw ForbiddenException if incorrect student', async () => {
      (
        service.commentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ studentId: 'st1' });

      await expect(
        service.updateFromStudent({ query: {} } as any, { id: 'st2' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateFromTeacher', () => {
    it('should update comment', async () => {
      (
        service.commentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.commentAssignmentRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'c1' });

      const result = await service.updateFromTeacher(
        { query: { commentOnAssignmentId: 'c1' } } as any,
        { id: 'u1' } as any,
      );

      expect(result.id).toBe('c1');
    });
  });

  describe('deleteFromStudent', () => {
    it('should delete comment if correct student', async () => {
      (
        service.commentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ studentId: 'st1' });
      (
        service.commentAssignmentRepository.delete as jest.Mock
      ).mockResolvedValue({ id: 'c1' });

      const result = await service.deleteFromStudent(
        { commentOnAssignmentId: 'c1' } as any,
        { id: 'st1' } as any,
      );

      expect(service.commentAssignmentRepository.delete).toHaveBeenCalledWith({
        commentOnAssignmentId: 'c1',
      });
      expect(result.id).toBe('c1');
    });
  });

  describe('deleteFromTeacher', () => {
    it('should delete comment if valid teacher', async () => {
      (
        service.commentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.commentAssignmentRepository.delete as jest.Mock
      ).mockResolvedValue({ id: 'c1' });

      const result = await service.deleteFromTeacher(
        { commentOnAssignmentId: 'c1' } as any,
        { id: 'u1' } as any,
      );

      expect(service.commentAssignmentRepository.delete).toHaveBeenCalledWith({
        commentOnAssignmentId: 'c1',
      });
      expect(result.id).toBe('c1');
    });
  });
});
