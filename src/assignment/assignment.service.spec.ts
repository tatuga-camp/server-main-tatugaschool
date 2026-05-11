import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentService } from './assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SubjectService } from '../subject/subject.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { AuthService } from '../auth/auth.service';
import { GradeService } from '../grade/grade.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';
import { StudentService } from '../student/student.service';
import { SchoolService } from '../school/school.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('googleapis', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));

describe('AssignmentService', () => {
  let service: AssignmentService;

  const mockPrismaService = {
    subject: {
      findUnique: jest.fn(),
    },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockSubjectService = {
    subjectRepository: {
      findUnique: jest.fn(),
    },
  };

  const mockSchoolService = {
    schoolRepository: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockLineBotService = {
    sendMessage: jest.fn(),
  };

  const mockSkillOnAssignmentService = {
    getByAssignmentId: jest.fn(),
  };

  const mockStorageService = {
    DeleteFileOnStorage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: {} },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: SubjectService, useValue: mockSubjectService },
        { provide: StudentOnSubjectService, useValue: {} },
        { provide: SkillService, useValue: {} },
        {
          provide: SkillOnAssignmentService,
          useValue: mockSkillOnAssignmentService,
        },
        { provide: AuthService, useValue: {} },
        { provide: GradeService, useValue: {} },
        { provide: ScoreOnSubjectService, useValue: {} },
        { provide: ScoreOnStudentService, useValue: {} },
        { provide: AssignmentVideoQuizRepository, useValue: {} },
        { provide: StudentService, useValue: {} },
        { provide: SchoolService, useValue: mockSchoolService },
        { provide: LineBotService, useValue: mockLineBotService },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<AssignmentService>(AssignmentService);

    // Mock inner repositories
    service.assignmentRepository = {
      getById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any;

    (service as any).fileAssignmentRepository = {
      findMany: jest.fn(),
    };

    (service as any).studentOnAssignmentRepository = {
      findMany: jest.fn(),
      createMany: jest.fn(),
    };

    (service as any).studentOnSubjectRepository = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAssignmentById', () => {
    it('should return assignment with files and skills', async () => {
      const mockUser = { id: 'user1' } as any;
      const mockAssignment = { id: 'a1', subjectId: 's1', vector: 'v' };
      const mockFiles = [{ id: 'f1' }];
      const mockSkills = [{ skill: { id: 'sk1' } }];

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service as any).fileAssignmentRepository.findMany.mockResolvedValue(
        mockFiles,
      );
      mockSkillOnAssignmentService.getByAssignmentId.mockResolvedValue(
        mockSkills,
      );

      const result = await service.getAssignmentById(
        { assignmentId: 'a1' },
        mockUser,
      );

      expect(service.assignmentRepository.getById).toHaveBeenCalledWith({
        assignmentId: 'a1',
      });
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'user1',
        subjectId: 's1',
      });
      expect(result.id).toBe('a1');
      expect(result.files).toEqual(mockFiles);
      expect(result.skills).toEqual([{ id: 'sk1' }]);
      expect((result as any).vector).toBeUndefined();
    });

    it('should throw NotFoundException if assignment is not found', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.getAssignmentById({ assignmentId: 'a1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAssignment', () => {
    it('should create an assignment successfully', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        subjectId: 's1',
        title: 'New Assignment',
        type: 'Assignment',
        beginDate: new Date(),
        maxScore: 10,
        status: 'Published',
      };

      const mockSubject = {
        id: 's1',
        schoolId: 'sch1',
        isLocked: false,
        isVerifyLine: true,
        lineGroupId: 'grp1',
        allowSendNotificationOnAssignmentToLine: true,
        code: 'SUB123',
      };
      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
        title: 'New Assignment',
      };

      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.create as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        plan: 'PREMIUM',
      });

      const result = await service.createAssignment(dto, mockUser);

      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(service.assignmentRepository.create).toHaveBeenCalled();
      expect(mockLineBotService.sendMessage).toHaveBeenCalled();
      expect(result.id).toBe('a1');
    });

    it('should throw BadRequestException if assignment missing required fields', async () => {
      const dto: any = { type: 'Assignment' };
      await expect(service.createAssignment(dto, {} as any)).rejects.toThrow(
        'Assign at and max score are required for assignment',
      );
    });
  });

  describe('updateAssignment', () => {
    it('should update an assignment successfully', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        query: { assignmentId: 'a1' },
        data: { title: 'Updated' },
      };

      const mockAssignment = { id: 'a1', subjectId: 's1' };
      const mockSubject = { id: 's1', isLocked: false };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.update as jest.Mock).mockResolvedValue({
        ...mockAssignment,
        title: 'Updated',
      });

      const result = await service.updateAssignment(dto, mockUser);

      expect(service.assignmentRepository.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { title: 'Updated' },
      });
      expect(result.title).toBe('Updated');
    });

    it('should throw NotFoundException if assignment is not found', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.updateAssignment(
          { query: { assignmentId: 'a1' }, data: {} } as any,
          {} as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAssignment', () => {
    it('should delete an assignment successfully', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
        type: 'Assignment',
      };
      const mockSubject = { id: 's1', isLocked: false };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.delete as jest.Mock).mockResolvedValue({
        totalDeleteSize: 100,
      });
      mockSchoolService.schoolRepository.update.mockResolvedValue({});

      const result = await service.deleteAssignment(
        { assignmentId: 'a1' } as any,
        mockUser,
      );

      expect(service.assignmentRepository.delete).toHaveBeenCalledWith({
        assignmentId: 'a1',
      });
      expect(mockSchoolService.schoolRepository.update).toHaveBeenCalledWith({
        where: { id: 'sch1' },
        data: { totalStorage: { decrement: 100 } },
      });
      expect(result.id).toBe('a1');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue({
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        isLocked: true,
      });

      await expect(
        service.deleteAssignment({ assignmentId: 'a1' } as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
