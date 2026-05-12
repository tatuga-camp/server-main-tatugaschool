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
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

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

  const mockGradeService = {
    gradeRepository: {
      findUnique: jest.fn(),
    },
    assignGrade: jest.fn(),
  };

  const mockScoreOnSubjectService = {
    scoreOnSubjectRepository: {
      findMany: jest.fn(),
    },
  };

  const mockScoreOnStudentService = {
    scoreOnStudentRepository: {
      findMany: jest.fn(),
    },
  };

  const mockStudentService = {
    studentRepository: {
      findById: jest.fn(),
    },
  };

  const mockStudentOnSubjectService = {
    studentOnSubjectRepository: {
      findFirst: jest.fn(),
    },
    getStudentOnSubjectsBySubjectId: jest.fn(),
  };

  const mockAssignmentVideoQuizRepository = {
    findMany: jest.fn(),
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
        {
          provide: StudentOnSubjectService,
          useValue: mockStudentOnSubjectService,
        },
        { provide: SkillService, useValue: {} },
        {
          provide: SkillOnAssignmentService,
          useValue: mockSkillOnAssignmentService,
        },
        { provide: AuthService, useValue: {} },
        { provide: GradeService, useValue: mockGradeService },
        { provide: ScoreOnSubjectService, useValue: mockScoreOnSubjectService },
        { provide: ScoreOnStudentService, useValue: mockScoreOnStudentService },
        {
          provide: AssignmentVideoQuizRepository,
          useValue: mockAssignmentVideoQuizRepository,
        },
        { provide: StudentService, useValue: mockStudentService },
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

  // ─────────────────────────────────────────────────────────────────────────────
  // getAssignmentById
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getAssignmentById', () => {
    it('should return assignment with files and skills, stripping vector', async () => {
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

    it('should validate teacher access before returning assignment', async () => {
      const mockUser = { id: 'user1' } as any;
      const mockAssignment = { id: 'a1', subjectId: 's1', vector: null };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.getAssignmentById({ assignmentId: 'a1' }, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getAssignmentBySubjectId
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getAssignmentBySubjectId', () => {
    it('should return assignments with stats for a teacher', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignments = [
        {
          id: 'a1',
          subjectId: 's1',
          type: 'Assignment',
          status: 'Published',
          vector: 'v',
        },
      ];
      const mockStudentOnAssignments = [
        { assignmentId: 'a1', status: 'SUBMITTED', isAssigned: true },
        { assignmentId: 'a1', status: 'PENDDING', isAssigned: true },
        { assignmentId: 'a1', status: 'REVIEWD', isAssigned: true },
      ];
      const mockFiles = [{ id: 'f1', assignmentId: 'a1' }];

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        mockAssignments,
      );
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        mockStudentOnAssignments,
      );
      (service as any).fileAssignmentRepository.findMany.mockResolvedValue(
        mockFiles,
      );

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        mockUser,
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
      expect(result[0].summitNumber).toBe(1);
      expect(result[0].penddingNumber).toBe(1);
      expect(result[0].reviewNumber).toBe(1);
      expect(result[0].files).toEqual(mockFiles);
    });

    it('should return empty array when student has no assignments', async () => {
      const mockStudent = { id: 'st1' } as any;

      (service as any).studentOnSubjectRepository.findFirst.mockResolvedValue({
        id: 'sos1',
      });
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        [],
      );

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        undefined,
        mockStudent,
      );

      expect(result).toEqual([]);
    });

    it('should throw ForbiddenException if student is not enrolled', async () => {
      const mockStudent = { id: 'st1' } as any;

      (service as any).studentOnSubjectRepository.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.getAssignmentBySubjectId(
          { subjectId: 's1' },
          undefined,
          mockStudent,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should filter only Published assignments for students', async () => {
      const mockStudent = { id: 'st1' } as any;
      const mockStudentOnSubject = { id: 'sos1' };
      const mockStudentsOnAssignments = [
        { assignmentId: 'a1', isAssigned: true },
        { assignmentId: 'a2', isAssigned: true },
      ];
      const mockAssignments = [
        {
          id: 'a1',
          subjectId: 's1',
          type: 'Assignment',
          status: 'Published',
          vector: null,
        },
        {
          id: 'a2',
          subjectId: 's1',
          type: 'Assignment',
          status: 'Draft',
          vector: null,
        },
      ];

      (service as any).studentOnSubjectRepository.findFirst.mockResolvedValue(
        mockStudentOnSubject,
      );
      (service as any).studentOnAssignmentRepository.findMany
        .mockResolvedValueOnce(mockStudentsOnAssignments) // first call for student's assignments
        .mockResolvedValueOnce([]); // second call for all student on assignments
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        mockAssignments,
      );
      (service as any).fileAssignmentRepository.findMany.mockResolvedValue([]);

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        undefined,
        mockStudent,
      );

      expect(result.every((a) => a.status === 'Published')).toBe(true);
    });

    it('should include VideoQuiz questions when assignments have VideoQuiz type', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignments = [
        {
          id: 'a1',
          subjectId: 's1',
          type: 'VideoQuiz',
          status: 'Published',
          vector: null,
        },
      ];
      const mockQuestions = [{ id: 'q1', assignmentId: 'a1' }];

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        mockAssignments,
      );
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        [],
      );
      (service as any).fileAssignmentRepository.findMany.mockResolvedValue([]);
      mockAssignmentVideoQuizRepository.findMany.mockResolvedValue(
        mockQuestions,
      );

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        mockUser,
      );

      expect(result[0].questions).toEqual(mockQuestions);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getOverviewScoreOnAssignment (student view)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getOverviewScoreOnAssignment', () => {
    const mockStudentRequest = { id: 'st1' } as any;

    it('should return grade, assignments, and scoreOnSubjects for a student', async () => {
      const mockSubject = { id: 's1' };
      const mockStudent = { id: 'st1' };
      const mockStudentOnSubject = { id: 'sos1' };
      const mockAssignments = [{ id: 'a1', subjectId: 's1' }];
      const mockStudentOnAssignments = [
        { id: 'sa1', assignmentId: 'a1', studentOnSubjectId: 'sos1' },
      ];
      const mockGrade = { id: 'g1', subjectId: 's1', gradeRules: '[]' };
      const mockScoreOnSubjects = [{ id: 'sc1', subjectId: 's1' }];
      const mockScoreOnStudents = [
        { id: 'scs1', scoreOnSubjectId: 'sc1', studentOnSubjectId: 'sos1' },
      ];

      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      mockStudentService.studentRepository.findById.mockResolvedValue(
        mockStudent,
      );
      mockStudentOnSubjectService.studentOnSubjectRepository.findFirst.mockResolvedValue(
        mockStudentOnSubject,
      );
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        mockAssignments,
      );
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        mockStudentOnAssignments,
      );
      mockGradeService.gradeRepository.findUnique.mockResolvedValue(mockGrade);
      mockScoreOnSubjectService.scoreOnSubjectRepository.findMany.mockResolvedValue(
        mockScoreOnSubjects,
      );
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        mockScoreOnStudents,
      );

      const result = await service.getOverviewScoreOnAssignment(
        { subjectId: 's1', studentId: 'st1' },
        mockStudentRequest,
      );

      expect(result.grade).not.toBeNull();
      expect(result.assignments).toHaveLength(1);
      expect(result.scoreOnSubjects).toHaveLength(1);
    });

    it('should throw NotFoundException if subject not found', async () => {
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(null);
      mockStudentService.studentRepository.findById.mockResolvedValue({
        id: 'st1',
      });

      await expect(
        service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: 'st1' },
          mockStudentRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if student not found', async () => {
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue({
        id: 's1',
      });
      mockStudentService.studentRepository.findById.mockResolvedValue(null);

      await expect(
        service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: 'st1' },
          mockStudentRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if student tries to access another student data', async () => {
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue({
        id: 's1',
      });
      mockStudentService.studentRepository.findById.mockResolvedValue({
        id: 'st2',
      }); // different student

      await expect(
        service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: 'st2' },
          { id: 'st1' } as any, // requesting student is st1
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return null grade when no grade rule exists', async () => {
      const mockSubject = { id: 's1' };
      const mockStudent = { id: 'st1' };
      const mockStudentOnSubject = { id: 'sos1' };

      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      mockStudentService.studentRepository.findById.mockResolvedValue(
        mockStudent,
      );
      mockStudentOnSubjectService.studentOnSubjectRepository.findFirst.mockResolvedValue(
        mockStudentOnSubject,
      );
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        [],
      );
      mockGradeService.gradeRepository.findUnique.mockResolvedValue(null);
      mockScoreOnSubjectService.scoreOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        [],
      );

      const result = await service.getOverviewScoreOnAssignment(
        { subjectId: 's1', studentId: 'st1' },
        mockStudentRequest,
      );

      expect(result.grade).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getOverviewScoreOnAssignments (teacher view)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getOverviewScoreOnAssignments', () => {
    it('should return grade, assignments, and scoreOnSubjects for a teacher', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignments = [{ id: 'a1', subjectId: 's1' }];
      const mockStudentOnAssignments = [
        { id: 'sa1', assignmentId: 'a1', subjectId: 's1' },
      ];
      const mockGrade = { id: 'g1', subjectId: 's1', gradeRules: '[]' };
      const mockScoreOnSubjects = [{ id: 'sc1', subjectId: 's1' }];
      const mockScoreOnStudents = [
        { id: 'scs1', scoreOnSubjectId: 'sc1', subjectId: 's1' },
      ];

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        mockAssignments,
      );
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        mockStudentOnAssignments,
      );
      mockGradeService.gradeRepository.findUnique.mockResolvedValue(mockGrade);
      mockScoreOnSubjectService.scoreOnSubjectRepository.findMany.mockResolvedValue(
        mockScoreOnSubjects,
      );
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        mockScoreOnStudents,
      );

      const result = await service.getOverviewScoreOnAssignments(
        { subjectId: 's1' },
        mockUser,
      );

      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].students).toHaveLength(1);
      expect(result.scoreOnSubjects).toHaveLength(1);
    });

    it('should return null grade when no grade rule exists', async () => {
      const mockUser = { id: 'u1' } as any;

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        [],
      );
      mockGradeService.gradeRepository.findUnique.mockResolvedValue(null);
      mockScoreOnSubjectService.scoreOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        [],
      );

      const result = await service.getOverviewScoreOnAssignments(
        { subjectId: 's1' },
        mockUser,
      );

      expect(result.grade).toBeNull();
    });

    it('should throw if teacher access validation fails', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.getOverviewScoreOnAssignments({ subjectId: 's1' }, {
          id: 'u1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // createAssignment
  // ─────────────────────────────────────────────────────────────────────────────
  describe('createAssignment', () => {
    it('should create an assignment successfully and send line notification', async () => {
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

    it('should throw BadRequestException if assignment type requires beginDate and maxScore but they are missing', async () => {
      const dto: any = { type: 'Assignment' };
      await expect(service.createAssignment(dto, {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message when required fields missing', async () => {
      const dto: any = { type: 'Assignment' };
      await expect(service.createAssignment(dto, {} as any)).rejects.toThrow(
        'Assign at and max score are required for assignment',
      );
    });

    it('should throw NotFoundException if subject not found', async () => {
      const dto: any = {
        subjectId: 's1',
        type: 'Assignment',
        beginDate: new Date(),
        maxScore: 10,
      };

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.createAssignment(dto, { id: 'u1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      const dto: any = {
        subjectId: 's1',
        type: 'Assignment',
        beginDate: new Date(),
        maxScore: 10,
      };

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.createAssignment(dto, { id: 'u1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create student on assignments when students are enrolled', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        subjectId: 's1',
        type: 'Assignment',
        beginDate: new Date(),
        maxScore: 10,
        status: 'Draft',
        assignAll: true,
      };

      const mockSubject = {
        id: 's1',
        schoolId: 'sch1',
        isLocked: false,
        isVerifyLine: false,
        code: 'SUB123',
      };
      const mockAssignment = { id: 'a1', subjectId: 's1', schoolId: 'sch1' };
      const mockStudentOnSubjects = [
        {
          id: 'sos1',
          studentId: 'st1',
          subjectId: 's1',
          schoolId: 'sch1',
          title: 'Mr.',
          firstName: 'John',
          lastName: 'Doe',
          number: '001',
          blurHash: null,
          photo: null,
        },
      ];

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      (service.assignmentRepository.create as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue(
        mockStudentOnSubjects,
      );

      await service.createAssignment(dto, mockUser);

      expect(
        (service as any).studentOnAssignmentRepository.createMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({
              assignmentId: 'a1',
              studentId: 'st1',
              isAssigned: true,
            }),
          ]),
        }),
      );
    });

    it('should NOT send line notification when school plan is FREE', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        subjectId: 's1',
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
      const mockAssignment = { id: 'a1', subjectId: 's1', schoolId: 'sch1' };

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      (service.assignmentRepository.create as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        plan: 'FREE',
      });

      await service.createAssignment(dto, mockUser);

      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
    });

    it('should NOT send line notification when status is Draft', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        subjectId: 's1',
        type: 'Assignment',
        beginDate: new Date(),
        maxScore: 10,
        status: 'Draft',
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
      const mockAssignment = { id: 'a1', subjectId: 's1', schoolId: 'sch1' };

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      (service.assignmentRepository.create as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );

      await service.createAssignment(dto, mockUser);

      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
    });

    it('should strip maxScore, dueDate, weight for Material type', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        subjectId: 's1',
        type: 'Material',
        title: 'Material Title',
        maxScore: 10,
        dueDate: new Date(),
        weight: 20,
        status: 'Draft',
      };

      const mockSubject = {
        id: 's1',
        schoolId: 'sch1',
        isLocked: false,
        isVerifyLine: false,
        code: 'SUB123',
      };
      const mockAssignment = { id: 'a1', subjectId: 's1', schoolId: 'sch1' };

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      (service.assignmentRepository.create as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );

      await service.createAssignment(dto, mockUser);

      const createCall = (service.assignmentRepository.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.data.maxScore).toBeUndefined();
      expect(createCall.data.dueDate).toBeUndefined();
      expect(createCall.data.weight).toBeUndefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // updateAssignment
  // ─────────────────────────────────────────────────────────────────────────────
  describe('updateAssignment', () => {
    it('should update an assignment successfully', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        query: { assignmentId: 'a1' },
        data: { title: 'Updated' },
      };

      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        status: 'Draft',
        schoolId: 'sch1',
      };
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

    it('should throw NotFoundException if subject is not found', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue(null);

      await expect(
        service.updateAssignment(
          { query: { assignmentId: 'a1' }, data: {} } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.updateAssignment(
          { query: { assignmentId: 'a1' }, data: {} } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should send line notification when status changes to Published on PREMIUM school', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        query: { assignmentId: 'a1' },
        data: { status: 'Published' },
      };

      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        status: 'Draft', // was Draft, now being Published
        schoolId: 'sch1',
      };
      const mockSubject = {
        id: 's1',
        isLocked: false,
        code: 'SUB123',
        lineGroupId: 'grp1',
      };
      const mockUpdated = {
        ...mockAssignment,
        status: 'Published',
        title: 'Test',
      };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.update as jest.Mock).mockResolvedValue(
        mockUpdated,
      );
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        plan: 'PREMIUM',
      });

      await service.updateAssignment(dto, mockUser);

      expect(mockLineBotService.sendMessage).toHaveBeenCalled();
    });

    it('should NOT send line notification when assignment was already Published', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        query: { assignmentId: 'a1' },
        data: { status: 'Published' },
      };

      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        status: 'Published', // already Published
        schoolId: 'sch1',
      };
      const mockSubject = { id: 's1', isLocked: false };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.update as jest.Mock).mockResolvedValue({
        ...mockAssignment,
      });

      await service.updateAssignment(dto, mockUser);

      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // deleteAssignment
  // ─────────────────────────────────────────────────────────────────────────────
  describe('deleteAssignment', () => {
    it('should delete an assignment successfully and update school storage', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
        type: 'Assignment',
        videoURL: null,
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

    it('should throw NotFoundException if assignment is not found', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.deleteAssignment({ assignmentId: 'a1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if subject is not found', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAssignment({ assignmentId: 'a1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.deleteAssignment({ assignmentId: 'a1' } as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should delete video from storage when VideoQuiz has unique videoURL', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
        type: 'VideoQuiz',
        videoURL: 'https://storage.example.com/video.mp4',
      };
      const mockSubject = { id: 's1', isLocked: false };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.delete as jest.Mock).mockResolvedValue({
        totalDeleteSize: 0,
      });
      // Only 1 assignment uses this videoURL
      (service.assignmentRepository.count as jest.Mock).mockResolvedValue(1);
      mockSchoolService.schoolRepository.update.mockResolvedValue({});

      await service.deleteAssignment({ assignmentId: 'a1' } as any, mockUser);

      expect(mockStorageService.DeleteFileOnStorage).toHaveBeenCalledWith({
        fileName: 'https://storage.example.com/video.mp4',
      });
    });

    it('should NOT delete video from storage when multiple assignments share the same videoURL', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
        type: 'VideoQuiz',
        videoURL: 'https://storage.example.com/video.mp4',
      };
      const mockSubject = { id: 's1', isLocked: false };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.delete as jest.Mock).mockResolvedValue({
        totalDeleteSize: 0,
      });
      // Multiple assignments use this videoURL
      (service.assignmentRepository.count as jest.Mock).mockResolvedValue(2);
      mockSchoolService.schoolRepository.update.mockResolvedValue({});

      await service.deleteAssignment({ assignmentId: 'a1' } as any, mockUser);

      expect(mockStorageService.DeleteFileOnStorage).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // reorder
  // ─────────────────────────────────────────────────────────────────────────────
  describe('reorder', () => {
    it('should reorder assignments and return sorted list without vector', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = { assignmentIds: ['a1', 'a2'] };
      const mockAssignments = [
        { id: 'a1', subjectId: 's1', vector: 'v1' },
        { id: 'a2', subjectId: 's1', vector: 'v2' },
      ];

      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        mockAssignments,
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.update as jest.Mock)
        .mockResolvedValueOnce({ id: 'a1', order: 1, vector: 'v1' })
        .mockResolvedValueOnce({ id: 'a2', order: 2, vector: 'v2' });

      const result = await service.reorder(dto, mockUser);

      expect(service.assignmentRepository.update).toHaveBeenCalledTimes(2);
      expect(service.assignmentRepository.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { order: 1 },
      });
      expect(service.assignmentRepository.update).toHaveBeenCalledWith({
        where: { id: 'a2' },
        data: { order: 2 },
      });
      expect(result.every((a) => (a as any).vector === undefined)).toBe(true);
    });

    it('should throw NotFoundException if not all assignments are found', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = { assignmentIds: ['a1', 'a2', 'a3'] };

      // Only 2 found, but 3 requested
      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue([
        { id: 'a1', subjectId: 's1' },
        { id: 'a2', subjectId: 's1' },
      ]);

      await expect(service.reorder(dto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
