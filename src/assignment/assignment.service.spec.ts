import { CacheService } from '../cache/cache.service';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';
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
    studentOnAssignment: {
      findMany: jest.fn(),
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
    sendMessage: jest.fn().mockResolvedValue(undefined),
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
        { provide: CacheService, useValue: createPassthroughCache() },
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
    it('should return assignment with files and skills', async () => {
      const mockUser = { id: 'user1' } as any;
      const mockAssignment = { id: 'a1', subjectId: 's1' };
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
    let reads: {
      subjectAssignments: jest.Mock;
      submissionCounts: jest.Mock;
      studentSubmissions: jest.Mock;
      enrollment: jest.Mock;
    };

    beforeEach(() => {
      reads = {
        subjectAssignments: jest
          .fn()
          .mockResolvedValue({ assignments: [], files: [], questions: [] }),
        submissionCounts: jest.fn().mockResolvedValue({}),
        studentSubmissions: jest.fn().mockResolvedValue([]),
        enrollment: jest.fn().mockResolvedValue(null),
      };
      (service as any).reads = reads;
    });

    it('should return assignments with stats for a teacher', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockAssignments = [
        {
          id: 'a1',
          subjectId: 's1',
          type: 'Assignment',
          status: 'Published',
        },
      ];
      const mockFiles = [{ id: 'f1', assignmentId: 'a1' }];

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      reads.subjectAssignments.mockResolvedValue({
        assignments: mockAssignments,
        files: mockFiles,
        questions: [],
      });
      reads.submissionCounts.mockResolvedValue({
        a1: {
          studentAssign: 3,
          summitNumber: 1,
          penddingNumber: 1,
          reviewNumber: 1,
        },
      });

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        mockUser,
      );

      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(reads.subjectAssignments).toHaveBeenCalledWith('s1');
      expect(reads.submissionCounts).toHaveBeenCalledWith('s1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('a1');
      expect(result[0].studentAssign).toBe(3);
      expect(result[0].summitNumber).toBe(1);
      expect(result[0].penddingNumber).toBe(1);
      expect(result[0].reviewNumber).toBe(1);
      expect(result[0].files).toEqual(mockFiles);
      expect(result[0].questions).toEqual([]);
      expect(result[0].studentOnAssignment).toBeUndefined();
    });

    it('should default counts to zero for an assignment with no submissions', async () => {
      const mockUser = { id: 'u1' } as any;
      reads.subjectAssignments.mockResolvedValue({
        assignments: [{ id: 'a1', type: 'Assignment', status: 'Draft' }],
        files: [],
        questions: [],
      });

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        mockUser,
      );

      expect(result[0]).toMatchObject({
        studentAssign: 0,
        summitNumber: 0,
        penddingNumber: 0,
        reviewNumber: 0,
        files: [],
      });
    });

    it('should return empty array when student has no assignments', async () => {
      const mockStudent = { id: 'st1' } as any;

      reads.enrollment.mockResolvedValue({ id: 'sos1' });
      reads.studentSubmissions.mockResolvedValue([
        { assignmentId: 'a1', isAssigned: false },
      ]);

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        undefined,
        mockStudent,
      );

      expect(result).toEqual([]);
      expect(reads.studentSubmissions).toHaveBeenCalledWith('s1', 'sos1');
      expect(reads.subjectAssignments).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if student is not enrolled', async () => {
      const mockStudent = { id: 'st1' } as any;

      reads.enrollment.mockResolvedValue(null);

      await expect(
        service.getAssignmentBySubjectId(
          { subjectId: 's1' },
          undefined,
          mockStudent,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(reads.enrollment).toHaveBeenCalledWith('s1', 'st1');
    });

    it('should return only Published assignments the student is assigned to', async () => {
      const mockStudent = { id: 'st1' } as any;
      const mine = [
        { id: 'soa1', assignmentId: 'a1', isAssigned: true },
        { id: 'soa2', assignmentId: 'a2', isAssigned: true },
      ];

      reads.enrollment.mockResolvedValue({ id: 'sos1' });
      reads.studentSubmissions.mockResolvedValue([
        ...mine,
        { id: 'soa4', assignmentId: 'a4', isAssigned: false },
      ]);
      reads.subjectAssignments.mockResolvedValue({
        assignments: [
          { id: 'a1', type: 'Assignment', status: 'Published' },
          { id: 'a2', type: 'Assignment', status: 'Draft' },
          { id: 'a3', type: 'Assignment', status: 'Published' },
          { id: 'a4', type: 'Assignment', status: 'Published' },
        ],
        files: [],
        questions: [],
      });

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        undefined,
        mockStudent,
      );

      expect(result.map((a) => a.id)).toEqual(['a1']);
      expect(result[0].studentOnAssignment).toEqual(mine[0]);
    });

    it('should include VideoQuiz questions when assignments have VideoQuiz type', async () => {
      const mockUser = { id: 'u1' } as any;
      const mockQuestions = [
        { id: 'q1', assignmentId: 'a1' },
        { id: 'q2', assignmentId: 'other' },
      ];

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      reads.subjectAssignments.mockResolvedValue({
        assignments: [{ id: 'a1', type: 'VideoQuiz', status: 'Published' }],
        files: [],
        questions: mockQuestions,
      });

      const result = await service.getAssignmentBySubjectId(
        { subjectId: 's1' },
        mockUser,
      );

      expect(result[0].questions).toEqual([mockQuestions[0]]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // getOverviewScoreOnAssignment (student view)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('getOverviewScoreOnAssignment', () => {
    const mockStudentRequest = { id: 'st1' } as any;
    let reads: {
      subjectAssignments: jest.Mock;
      studentSubmissions: jest.Mock;
      enrollment: jest.Mock;
    };
    let refs: { subject: jest.Mock };
    let gradeReads: { subjectGrades: jest.Mock };

    beforeEach(() => {
      reads = {
        subjectAssignments: jest
          .fn()
          .mockResolvedValue({ assignments: [], files: [], questions: [] }),
        studentSubmissions: jest.fn().mockResolvedValue([]),
        enrollment: jest.fn().mockResolvedValue({ id: 'sos1' }),
      };
      refs = { subject: jest.fn().mockResolvedValue({ schoolId: 'sch1' }) };
      gradeReads = {
        subjectGrades: jest
          .fn()
          .mockResolvedValue({ grade: null, scoreOnSubjects: [] }),
      };
      (service as any).reads = reads;
      (service as any).refs = refs;
      (service as any).gradeReads = gradeReads;
      mockStudentService.studentRepository.findById.mockResolvedValue({
        id: 'st1',
      });
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        [],
      );
    });

    it('should return grade, assignments, and scoreOnSubjects for a student', async () => {
      reads.subjectAssignments.mockResolvedValue({
        assignments: [
          { id: 'a1', status: 'Published', type: 'Assignment' },
          { id: 'a2', status: 'Draft', type: 'Assignment' },
          { id: 'a3', status: 'Published', type: 'VideoQuiz' },
        ],
        files: [],
        questions: [],
      });
      reads.studentSubmissions.mockResolvedValue([
        { id: 'sa1', assignmentId: 'a1', studentOnSubjectId: 'sos1' },
      ]);
      gradeReads.subjectGrades.mockResolvedValue({
        grade: { id: 'g1', subjectId: 's1', gradeRules: '[]' },
        scoreOnSubjects: [{ id: 'sc1', subjectId: 's1' }],
      });
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        [{ id: 'scs1', scoreOnSubjectId: 'sc1', studentOnSubjectId: 'sos1' }],
      );

      const result = await service.getOverviewScoreOnAssignment(
        { subjectId: 's1', studentId: 'st1' },
        mockStudentRequest,
      );

      expect(refs.subject).toHaveBeenCalledWith('s1');
      expect(reads.enrollment).toHaveBeenCalledWith('s1', 'st1');
      expect(reads.studentSubmissions).toHaveBeenCalledWith('s1', 'sos1');
      expect(gradeReads.subjectGrades).toHaveBeenCalledWith('s1');
      expect(
        mockScoreOnStudentService.scoreOnStudentRepository.findMany,
      ).toHaveBeenCalledWith({ where: { studentOnSubjectId: 'sos1' } });
      expect(result.grade).toEqual({
        id: 'g1',
        subjectId: 's1',
        gradeRules: [],
      });
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0].assignment.id).toBe('a1');
      expect(result.assignments[0].studentOnAssignment.id).toBe('sa1');
      expect(result.scoreOnSubjects).toHaveLength(1);
      expect(result.scoreOnSubjects[0].students).toHaveLength(1);
    });

    it('should throw NotFoundException if subject not found', async () => {
      refs.subject.mockResolvedValue(null);

      await expect(
        service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: 'st1' },
          mockStudentRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if student not found', async () => {
      mockStudentService.studentRepository.findById.mockResolvedValue(null);

      await expect(
        service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: 'st1' },
          mockStudentRequest,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if student tries to access another student data', async () => {
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

    it('should throw ForbiddenException if the student is not enrolled', async () => {
      reads.enrollment.mockResolvedValue(null);

      await expect(
        service.getOverviewScoreOnAssignment(
          { subjectId: 's1', studentId: 'st1' },
          mockStudentRequest,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(reads.studentSubmissions).not.toHaveBeenCalled();
    });

    it('should return null grade when no grade rule exists', async () => {
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
    let reads: { subjectAssignments: jest.Mock };
    let gradeReads: { subjectGrades: jest.Mock };

    beforeEach(() => {
      reads = {
        subjectAssignments: jest
          .fn()
          .mockResolvedValue({ assignments: [], files: [], questions: [] }),
      };
      gradeReads = {
        subjectGrades: jest
          .fn()
          .mockResolvedValue({ grade: null, scoreOnSubjects: [] }),
      };
      (service as any).reads = reads;
      (service as any).gradeReads = gradeReads;
      mockPrismaService.studentOnAssignment.findMany.mockResolvedValue([]);
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        [],
      );
    });

    it('should return grade, assignments, and scoreOnSubjects for a teacher', async () => {
      const mockUser = { id: 'u1' } as any;

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      reads.subjectAssignments.mockResolvedValue({
        assignments: [
          { id: 'a1', status: 'Published', type: 'Assignment' },
          { id: 'a2', status: 'Published', type: 'VideoQuiz' },
          { id: 'a3', status: 'Published', type: 'Material' },
          { id: 'a4', status: 'Draft', type: 'Assignment' },
        ],
        files: [],
        questions: [],
      });
      mockPrismaService.studentOnAssignment.findMany.mockResolvedValue([
        { id: 'sa1', assignmentId: 'a1' },
      ]);
      gradeReads.subjectGrades.mockResolvedValue({
        grade: { id: 'g1', subjectId: 's1', gradeRules: '[]' },
        scoreOnSubjects: [{ id: 'sc1', subjectId: 's1' }],
      });
      mockScoreOnStudentService.scoreOnStudentRepository.findMany.mockResolvedValue(
        [{ id: 'scs1', scoreOnSubjectId: 'sc1', subjectId: 's1' }],
      );

      const result = await service.getOverviewScoreOnAssignments(
        { subjectId: 's1' },
        mockUser,
      );

      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(reads.subjectAssignments).toHaveBeenCalledWith('s1');
      expect(gradeReads.subjectGrades).toHaveBeenCalledWith('s1');
      expect(result.assignments.map((a) => a.assignment.id)).toEqual([
        'a1',
        'a2',
      ]);
      expect(result.assignments[0].students).toHaveLength(1);
      expect(result.assignments[1].students).toHaveLength(0);
      expect(result.scoreOnSubjects).toHaveLength(1);
      expect(result.scoreOnSubjects[0].students).toHaveLength(1);
    });

    it('should read submissions without answer bodies', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      await service.getOverviewScoreOnAssignments({ subjectId: 's1' }, {
        id: 'u1',
      } as any);

      expect(
        mockPrismaService.studentOnAssignment.findMany,
      ).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        select: {
          id: true,
          assignmentId: true,
          studentOnSubjectId: true,
          studentId: true,
          score: true,
          status: true,
          isAssigned: true,
          firstName: true,
          lastName: true,
          number: true,
          photo: true,
        },
      });
      const args =
        mockPrismaService.studentOnAssignment.findMany.mock.calls[0][0];
      expect(args.select.body).toBeUndefined();
    });

    it('should return null grade when no grade rule exists', async () => {
      const mockUser = { id: 'u1' } as any;

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

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

    it('should forward tags to the repository create call', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        subjectId: 's1',
        type: 'Assignment',
        beginDate: new Date(),
        maxScore: 10,
        status: 'Draft',
        tags: ['Homework'],
      };

      const mockSubject = {
        id: 's1',
        schoolId: 'sch1',
        isLocked: false,
        isVerifyLine: false,
        code: 'SUB123',
      };
      const mockAssignment = { id: 'a-new', subjectId: 's1', schoolId: 'sch1' };

      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(
        mockSubject,
      );
      (service.assignmentRepository.create as jest.Mock).mockResolvedValue({
        ...mockAssignment,
        tags: ['Homework'],
      });
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );

      await service.createAssignment(dto, mockUser);

      const createCall = (service.assignmentRepository.create as jest.Mock).mock
        .calls[0][0];
      expect(createCall.data.tags).toEqual(['Homework']);
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

    it('should forward tags to the repository update call', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        query: { assignmentId: 'a1' },
        data: { tags: ['Homework', 'Test'] },
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
        tags: ['Homework', 'Test'],
      });

      await service.updateAssignment(dto, mockUser);

      expect(service.assignmentRepository.update).toHaveBeenCalledWith({
        where: { id: 'a1' },
        data: { tags: ['Homework', 'Test'] },
      });
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
        isVerifyLine: true,
        allowSendNotificationOnAssignmentToLine: true,
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

      expect(mockLineBotService.sendMessage).toHaveBeenCalledWith({
        groupId: 'grp1',
        message: expect.stringContaining('Test'),
      });
    });

    const publishToLineSubject = {
      id: 's1',
      isLocked: false,
      code: 'SUB123',
      lineGroupId: 'grp1',
      isVerifyLine: true,
      allowSendNotificationOnAssignmentToLine: true,
    };

    const publishAssignment = async (subjectOverrides: any) => {
      const dto: any = {
        query: { assignmentId: 'a1' },
        data: { status: 'Published' },
      };
      const mockAssignment = {
        id: 'a1',
        subjectId: 's1',
        status: 'Draft',
        schoolId: 'sch1',
      };

      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue({
        ...publishToLineSubject,
        ...subjectOverrides,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.update as jest.Mock).mockResolvedValue({
        ...mockAssignment,
        status: 'Published',
        title: 'Test',
      });
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        plan: 'PREMIUM',
      });

      await service.updateAssignment(dto, { id: 'u1' } as any);
    };

    it('should NOT send line notification when subject line group is not verified', async () => {
      await publishAssignment({ isVerifyLine: false });

      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
    });

    it('should NOT send line notification when subject has no line group', async () => {
      await publishAssignment({ lineGroupId: null });

      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
    });

    it('should NOT send line notification when subject disallows assignment notifications to line', async () => {
      await publishAssignment({
        allowSendNotificationOnAssignmentToLine: false,
      });

      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
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
    it('should reorder assignments and return the sorted list', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = { assignmentIds: ['a1', 'a2'] };
      const mockAssignments = [
        { id: 'a1', subjectId: 's1' },
        { id: 'a2', subjectId: 's1' },
      ];

      (service.assignmentRepository.findMany as jest.Mock).mockResolvedValue(
        mockAssignments,
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.assignmentRepository.update as jest.Mock)
        .mockResolvedValueOnce({ id: 'a1', order: 1 })
        .mockResolvedValueOnce({ id: 'a2', order: 2 });

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
      expect(result).toEqual([
        { id: 'a1', order: 1 },
        { id: 'a2', order: 2 },
      ]);
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
