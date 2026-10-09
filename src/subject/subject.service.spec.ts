jest.mock('../member-on-school/member-on-school.raw');
import { CacheService } from '../cache/cache.service';
import {
  createPassthroughCache,
  createTestCache,
} from '../cache/testing/cache-test-utils';
import { subjectScope } from '../cache/cache-scopes';
import { findFirstMemberOnSchoolByUser } from '../member-on-school/member-on-school.raw';
import { Test, TestingModule } from '@nestjs/testing';
import { SubjectService } from './subject.service';
import { SubjectReads } from './subject.reads';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { GradeService } from '../grade/grade.service';
import { AssignmentService } from '../assignment/assignment.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { RedisService } from '../redis/redis.service';
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

describe('SubjectService', () => {
  let service: SubjectService;

  const mockPrismaService = {
    memberOnSchool: { findFirst: jest.fn() },
    subject: { findUnique: jest.fn() },
    teacherOnSubject: { create: jest.fn(), findMany: jest.fn() },
    questionOnVideo: { findMany: jest.fn(), create: jest.fn() },
    studentOnSubject: { findMany: jest.fn() },
    rubric: { findMany: jest.fn(), create: jest.fn() },
    rubricScoreOnStudentAssignment: { findMany: jest.fn() },
    announcement: { findMany: jest.fn() },
    fileOnAnnouncement: { findMany: jest.fn() },
    commentOnAnnouncement: { findMany: jest.fn() },
    assignment: { update: jest.fn() },
    assignmentOnQuiz: { findMany: jest.fn(), createMany: jest.fn() },
  };

  const mockWheelOfNameService = {
    get: jest.fn(),
    create: jest.fn(),
  };

  const mockAttendanceTableService = {
    createAttendanceTable: jest.fn(),
    attendanceTableRepository: {
      findMany: jest.fn(),
      deleteAttendanceTable: jest.fn(),
      createAttendanceTable: jest.fn(),
    },
    attendanceRepository: { findMany: jest.fn() },
    attendanceRowRepository: { findMany: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
    teacherOnSubjectRepository: { findMany: jest.fn() },
  };

  const mockClassService = {
    classRepository: { findById: jest.fn(), findMany: jest.fn() },
    validateAccess: jest.fn(),
  };

  const mockMemberOnSchoolService = {
    validateAccess: jest.fn(),
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

  const mockGradeService = {
    gradeRepository: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    assignGrade: jest.fn(),
  };

  const mockAssignmentService = {
    assignmentRepository: { findMany: jest.fn() },
    createAssignment: jest.fn(),
  };

  const mockFileAssignmentService = {
    fileAssignmentRepository: { findMany: jest.fn(), create: jest.fn() },
  };

  const mockAttendanceStatusListService = {
    attendanceStatusListSRepository: { findMany: jest.fn(), create: jest.fn() },
  };

  const mockLineBotService = {
    sendMessage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: CacheService, useValue: createPassthroughCache() },
        SubjectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: {} },
        { provide: WheelOfNameService, useValue: mockWheelOfNameService },
        {
          provide: AttendanceTableService,
          useValue: mockAttendanceTableService,
        },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: ClassService, useValue: mockClassService },
        { provide: MemberOnSchoolService, useValue: mockMemberOnSchoolService },
        { provide: SchoolService, useValue: mockSchoolService },
        { provide: GradeService, useValue: mockGradeService },
        { provide: AssignmentService, useValue: mockAssignmentService },
        { provide: FileAssignmentService, useValue: mockFileAssignmentService },
        {
          provide: AttendanceStatusListService,
          useValue: mockAttendanceStatusListService,
        },
        { provide: LineBotService, useValue: mockLineBotService },
        { provide: PrismaReadService, useValue: {} },
        { provide: RedisService, useValue: {} },
      ],
    }).compile();

    service = module.get<SubjectService>(SubjectService);

    service.subjectRepository = {
      findFirst: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      getSubjectById: jest.fn(),
      findMany: jest.fn(),
      createSubject: jest.fn(),
      reorderSubjects: jest.fn(),
      deleteSubject: jest.fn(),
      getTotalDeleteSize: jest.fn(),
    } as any;

    (service as any).studentOnSubjectRepository = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      getStudentOnSubjectsBySubjectId: jest.fn(),
    };

    (service as any).studentRepository = {
      findById: jest.fn(),
      findByClassId: jest.fn(),
    };

    (service as any).studentOnAssignmentRepository = {
      findMany: jest.fn(),
    };

    (service as any).scoreOnSubjectRepository = {
      createSocreOnSubject: jest.fn(),
      findMany: jest.fn(),
    };

    (service as any).scoreOnStudentRepository = { findMany: jest.fn() };
    (service as any).fileOnStudentAssignmentRepository = {
      findMany: jest.fn(),
    };
    (service as any).commentAssignmentRepository = { findMany: jest.fn() };
    (service as any).skillOnAssignmentRepository = { findMany: jest.fn() };
    (service as any).skillOnStudentAssignmentRepository = {
      findMany: jest.fn(),
    };
    (service as any).groupOnSubjectRepository = { findMany: jest.fn() };
    (service as any).unitOnGroupRepository = { findMany: jest.fn() };
    (service as any).studentOnGroupRepository = { findMany: jest.fn() };
    (service as any).assignmentVideoQuizRepository = { findMany: jest.fn() };
    service['userRepository'] = {
      findById: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('leaveGroupLine', () => {
    it('should remove lineGroupId from subject', async () => {
      (service.subjectRepository.findFirst as jest.Mock).mockResolvedValue({
        id: 's1',
      });
      (service.subjectRepository.update as jest.Mock).mockResolvedValue({
        id: 's1',
        lineGroupId: null,
      });

      const result = await service.leaveGroupLine({ groupId: 'g1' });

      expect(service.subjectRepository.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { isVerifyLine: false, lineGroupId: null },
      });
      expect((result as any)?.id).toBe('s1');
    });
  });

  describe('duplicateSubject', () => {
    it('should throw NotFoundException if subject or classroom not found', async () => {
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      mockClassService.classRepository.findById.mockResolvedValue(null);
      await expect(
        service.duplicateSubject(
          { subjectId: 's1', classroomId: 'c1' } as any,
          {} as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should duplicate subject successfully', async () => {
      const mockSubject = { id: 's1', schoolId: 'sch1', title: 'Old Subject' };
      const mockClassroom = { id: 'c1' };
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue(
        mockSubject,
      );
      mockClassService.classRepository.findById.mockResolvedValue(
        mockClassroom,
      );
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);

      mockAssignmentService.assignmentRepository.findMany.mockResolvedValue([
        { id: 'a1', title: 'Ass1' },
      ]);

      jest
        .spyOn(service, 'createSubject')
        .mockResolvedValue({ id: 's2', schoolId: 'sch1' } as any);

      mockAttendanceTableService.attendanceTableRepository.findMany.mockResolvedValue(
        [{ id: 'at1', title: 'T1' }],
      );
      mockAttendanceTableService.attendanceTableRepository.createAttendanceTable.mockResolvedValue(
        { id: 'at2' },
      );

      mockAttendanceStatusListService.attendanceStatusListSRepository.findMany.mockResolvedValue(
        [{ attendanceTableId: 'at1', title: 'S1' }],
      );

      mockAssignmentService.createAssignment.mockResolvedValue({ id: 'na1' });

      mockFileAssignmentService.fileAssignmentRepository.findMany.mockResolvedValue(
        [{ id: 'f1' }],
      );

      mockPrismaService.questionOnVideo.findMany.mockResolvedValue([
        { id: 'qv1' },
      ]);

      // No rubrics on the source subject in this case.
      mockPrismaService.rubric.findMany.mockResolvedValue([]);

      const result = await service.duplicateSubject(
        {
          subjectId: 's1',
          classroomId: 'c1',
          title: 'New',
          description: 'Desc',
          educationYear: '2024',
        } as any,
        { id: 'u1' } as any,
      );

      expect(service.createSubject).toHaveBeenCalled();
      expect(
        mockAttendanceTableService.attendanceTableRepository
          .createAttendanceTable,
      ).toHaveBeenCalled();
      expect(mockAssignmentService.createAssignment).toHaveBeenCalled();
      expect(result).toEqual(mockSubject);
      expect((service as any).cache.bump).toHaveBeenCalledWith(
        subjectScope('s2', 'assignments'),
        subjectScope('s2', 'roster'),
      );
    });

    it('should duplicate rubrics and re-attach them to duplicated assignments', async () => {
      const mockSubject = { id: 's1', schoolId: 'sch1', title: 'Old Subject' };
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue(
        mockSubject,
      );
      mockClassService.classRepository.findById.mockResolvedValue({ id: 'c1' });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      jest
        .spyOn(service, 'createSubject')
        .mockResolvedValue({ id: 's2', schoolId: 'sch1' } as any);

      // No attendance tables/status to keep the test focused on rubrics.
      mockAttendanceTableService.attendanceTableRepository.findMany.mockResolvedValue(
        [],
      );
      mockAttendanceStatusListService.attendanceStatusListSRepository.findMany.mockResolvedValue(
        [],
      );

      // One assignment that references rubric r1.
      mockAssignmentService.assignmentRepository.findMany.mockResolvedValue([
        { id: 'a1', title: 'Ass1', rubricId: 'r1' },
      ]);
      mockAssignmentService.createAssignment.mockResolvedValue({ id: 'na1' });
      mockFileAssignmentService.fileAssignmentRepository.findMany.mockResolvedValue(
        [],
      );
      mockPrismaService.questionOnVideo.findMany.mockResolvedValue([]);

      // Source subject has one rubric (r1) with one criterion + two levels.
      mockPrismaService.rubric.findMany.mockResolvedValue([
        {
          id: 'r1',
          title: 'Presentation',
          description: 'desc',
          criteria: [
            {
              id: 'cr1',
              title: 'Delivery',
              description: null,
              weight: 2,
              order: 0,
              levels: [
                {
                  id: 'l1',
                  title: 'Great',
                  description: 'g',
                  points: 4,
                  order: 0,
                },
                {
                  id: 'l2',
                  title: 'Poor',
                  description: null,
                  points: 1,
                  order: 1,
                },
              ],
            },
          ],
        },
      ]);
      mockPrismaService.rubric.create.mockResolvedValue({ id: 'r2' });
      mockPrismaService.assignment.update.mockResolvedValue({ id: 'na1' });

      await service.duplicateSubject(
        {
          subjectId: 's1',
          classroomId: 'c1',
          title: 'New',
          description: 'Desc',
          educationYear: '2024',
        } as any,
        { id: 'u1' } as any,
      );

      // The rubric is cloned into the new subject with its nested tree.
      expect(mockPrismaService.rubric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Presentation',
            subjectId: 's2',
            schoolId: 'sch1',
            userId: 'u1',
            criteria: {
              create: [
                expect.objectContaining({
                  title: 'Delivery',
                  weight: 2,
                  order: 0,
                  levels: {
                    create: [
                      expect.objectContaining({
                        title: 'Great',
                        points: 4,
                        order: 0,
                      }),
                      expect.objectContaining({
                        title: 'Poor',
                        points: 1,
                        order: 1,
                      }),
                    ],
                  },
                }),
              ],
            },
          }),
        }),
      );

      // The duplicated assignment is re-attached to the cloned rubric (r2).
      expect(mockPrismaService.assignment.update).toHaveBeenCalledWith({
        where: { id: 'na1' },
        data: { rubricId: 'r2' },
        select: { id: true },
      });
    });

    it('should duplicate quiz settings, questions and max score', async () => {
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      mockClassService.classRepository.findById.mockResolvedValue({ id: 'c1' });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      jest
        .spyOn(service, 'createSubject')
        .mockResolvedValue({ id: 's2', schoolId: 'sch1' } as any);
      mockAttendanceTableService.attendanceTableRepository.findMany.mockResolvedValue(
        [],
      );
      mockAttendanceStatusListService.attendanceStatusListSRepository.findMany.mockResolvedValue(
        [],
      );
      mockPrismaService.rubric.findMany.mockResolvedValue([]);
      mockFileAssignmentService.fileAssignmentRepository.findMany.mockResolvedValue(
        [],
      );
      mockPrismaService.questionOnVideo.findMany.mockResolvedValue([]);

      const quizSettings = {
        scoringMode: 'PARTIAL',
        timeLimitMinutes: 20,
        shuffleQuestions: true,
        shuffleOptions: false,
        testMode: true,
        showAnswersAfterSubmit: false,
      };
      mockAssignmentService.assignmentRepository.findMany.mockResolvedValue([
        {
          id: 'q1',
          title: 'Quiz 1',
          type: 'Quiz',
          status: 'Published',
          maxScore: 3,
          quizSettings,
        },
      ]);
      mockAssignmentService.createAssignment.mockResolvedValue({ id: 'nq1' });
      mockPrismaService.assignment.update.mockResolvedValue({ id: 'nq1' });
      const options = [
        { id: 'o1', text: 'A', imageUrl: null, isCorrect: true },
        { id: 'o2', text: 'B', imageUrl: null, isCorrect: false },
      ];
      const blanks = [{ id: 'b1', acceptedAnswers: ['แมว'] }];
      mockPrismaService.assignmentOnQuiz.findMany.mockResolvedValue([
        {
          id: 'qq1',
          order: 0,
          type: 'SINGLE',
          prompt: 'Pick A',
          imageUrl: 'https://img/1.png',
          points: 1,
          options,
          blanks: [],
          assignmentId: 'q1',
          subjectId: 's1',
          schoolId: 'sch1',
        },
        {
          id: 'qq2',
          order: 1,
          type: 'FILL_BLANK',
          prompt: 'A [[b1]]',
          imageUrl: null,
          points: 2,
          options: [],
          blanks,
          assignmentId: 'q1',
          subjectId: 's1',
          schoolId: 'sch1',
        },
      ]);

      await service.duplicateSubject(
        {
          subjectId: 's1',
          classroomId: 'c1',
          title: 'New',
          description: 'Desc',
          educationYear: '2024',
        } as any,
        { id: 'u1' } as any,
      );

      expect(mockAssignmentService.createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Quiz',
          subjectId: 's2',
          quizSettings,
        }),
        { id: 'u1' },
      );
      expect(mockPrismaService.assignmentOnQuiz.findMany).toHaveBeenCalledWith({
        where: { assignmentId: 'q1' },
        orderBy: { order: 'asc' },
      });
      expect(
        mockPrismaService.assignmentOnQuiz.createMany,
      ).toHaveBeenCalledWith({
        data: [
          {
            order: 0,
            type: 'SINGLE',
            prompt: 'Pick A',
            imageUrl: 'https://img/1.png',
            points: 1,
            options,
            blanks: [],
            assignmentId: 'nq1',
            subjectId: 's2',
            schoolId: 'sch1',
          },
          {
            order: 1,
            type: 'FILL_BLANK',
            prompt: 'A [[b1]]',
            imageUrl: null,
            points: 2,
            options: [],
            blanks,
            assignmentId: 'nq1',
            subjectId: 's2',
            schoolId: 'sch1',
          },
        ],
      });
      // createAssignment zeroes a quiz's max score; the copy restores the
      // source total because the questions are copied unchanged.
      expect(mockPrismaService.assignment.update).toHaveBeenCalledWith({
        where: { id: 'nq1' },
        data: { maxScore: 3 },
        select: { id: true },
      });
    });
  });

  describe('getSubjectById', () => {
    it('should throw ForbiddenException if student does not belong to subject', async () => {
      (service as any).studentOnSubjectRepository.findFirst.mockResolvedValue(
        null,
      );
      await expect(
        service.getSubjectById({ subjectId: 's1' }, undefined, {
          id: 'st1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return subject', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isDeleted: false, wheelOfNamePath: 'path1' },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockWheelOfNameService.get.mockResolvedValue(true);

      const result = await service.getSubjectById({ subjectId: 's1' }, {
        id: 'u1',
      } as any);

      expect(result.id).toBe('s1');
    });

    it('should throw NotFoundException if subject is deleted', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isDeleted: true },
      );

      await expect(
        service.getSubjectById({ subjectId: 's1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create wheel of name if it returns 404', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isDeleted: false, wheelOfNamePath: 'path1', title: 'Math' },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockWheelOfNameService.get.mockRejectedValue({
        response: { status: 404 },
      });
      (
        service as any
      ).studentOnSubjectRepository.getStudentOnSubjectsBySubjectId.mockResolvedValue(
        [{ title: 'Mr', firstName: 'John', lastName: 'Doe' }],
      );
      mockWheelOfNameService.create.mockResolvedValue({
        data: { path: 'new_path' },
      });
      (service.subjectRepository.update as jest.Mock).mockResolvedValue({
        id: 's1',
        wheelOfNamePath: 'new_path',
      });

      const result = await service.getSubjectById({ subjectId: 's1' }, {
        id: 'u1',
      } as any);

      expect(mockWheelOfNameService.create).toHaveBeenCalled();
      expect(service.subjectRepository.update).toHaveBeenCalled();
      expect(result.id).toBe('s1');
    });

    it('should still return the subject when re-creating the wheel of name fails (e.g. upstream 503)', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isDeleted: false, wheelOfNamePath: 'path1', title: 'Math' },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockWheelOfNameService.get.mockRejectedValue({
        response: { status: 404 },
      });
      (
        service as any
      ).studentOnSubjectRepository.getStudentOnSubjectsBySubjectId.mockResolvedValue(
        [{ title: 'Mr', firstName: 'John', lastName: 'Doe' }],
      );
      mockWheelOfNameService.create.mockRejectedValue({
        response: { status: 503 },
        message: 'Request failed with status code 503',
      });

      const result = await service.getSubjectById({ subjectId: 's1' }, {
        id: 'u1',
      } as any);

      expect(mockWheelOfNameService.create).toHaveBeenCalled();
      expect(service.subjectRepository.update).not.toHaveBeenCalled();
      expect(result.id).toBe('s1');
    });
  });

  describe('getBySchoolId', () => {
    it('should throw ForbiddenException if memberOnSchool not found', async () => {
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getBySchoolId({ schoolId: 'sch1', educationYear: '2024' }, {
          id: 'u1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return subjects', async () => {
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue({
        schoolId: 'sch1',
      });
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', classId: 'c1' },
      ]);
      mockTeacherOnSubjectService.teacherOnSubjectRepository.findMany.mockResolvedValue(
        [{ subjectId: 's1', id: 't1' }],
      );
      mockClassService.classRepository.findMany.mockResolvedValue([
        { id: 'c1', name: 'Class 1' },
      ]);

      const result = await service.getBySchoolId(
        { schoolId: 'sch1', educationYear: '2024' },
        { id: 'u1' } as any,
      );
      expect(result.length).toBe(1);
      expect(result[0].teachers.length).toBe(1);
      expect(result[0].class.id).toBe('c1');
    });

    it('should return [] without querying teachers or classes when school has no subjects', async () => {
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue({
        schoolId: 'sch1',
      });
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getBySchoolId(
        { schoolId: 'sch1', educationYear: '2024' },
        { id: 'u1' } as any,
      );

      // OR: [] compiles to an always-false $expr that COLLSCANs the whole
      // collection on MongoDB — the queries must be skipped entirely.
      expect(result).toEqual([]);
      expect(
        mockTeacherOnSubjectService.teacherOnSubjectRepository.findMany,
      ).not.toHaveBeenCalled();
      expect(mockClassService.classRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getSubjectsThatStudentBelongTo', () => {
    it('should throw NotFoundException if student not found', async () => {
      (service as any).studentRepository.findById.mockResolvedValue(null);
      await expect(
        service.getSubjectsThatStudentBelongTo(
          { studentId: 'st1', educationYear: '2024' },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if student user id does not match', async () => {
      (service as any).studentRepository.findById.mockResolvedValue({
        id: 'st1',
      });
      await expect(
        service.getSubjectsThatStudentBelongTo(
          { studentId: 'st1', educationYear: '2024' },
          { id: 'st2' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return empty if student is in no subjects', async () => {
      (service as any).studentRepository.findById.mockResolvedValue({
        id: 'st1',
      });
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );
      const result = await service.getSubjectsThatStudentBelongTo(
        { studentId: 'st1', educationYear: '2024' },
        { id: 'st1' } as any,
      );
      expect(result).toEqual([]);
    });

    it('should return empty if no subjects found', async () => {
      (service as any).studentRepository.findById.mockResolvedValue({
        id: 'st1',
      });
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue([
        { subjectId: 's1' },
      ]);
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([]);
      const result = await service.getSubjectsThatStudentBelongTo(
        { studentId: 'st1', educationYear: '2024' },
        { id: 'st1' } as any,
      );
      expect(result).toEqual([]);
    });

    it('should return complete status if no assignments', async () => {
      (service as any).studentRepository.findById.mockResolvedValue({
        id: 'st1',
      });
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue([
        { subjectId: 's1' },
      ]);
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([
        { id: 's1' },
      ]);
      mockAssignmentService.assignmentRepository.findMany.mockResolvedValue([]);

      const result = await service.getSubjectsThatStudentBelongTo(
        { studentId: 'st1', educationYear: '2024' },
        { id: 'st1' } as any,
      );
      expect(result[0].status).toBe('complete');
    });

    it('should return uncomplete status if pending assignments', async () => {
      (service as any).studentRepository.findById.mockResolvedValue({
        id: 'st1',
      });
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue([
        { subjectId: 's1' },
      ]);
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([
        { id: 's1' },
      ]);
      mockAssignmentService.assignmentRepository.findMany.mockResolvedValue([
        { id: 'a1', subjectId: 's1' },
      ]);
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        [{ subjectId: 's1', assignmentId: 'a1', status: 'PENDDING' }],
      );

      const result = await service.getSubjectsThatStudentBelongTo(
        { studentId: 'st1', educationYear: '2024' },
        { id: 'st1' } as any,
      );
      expect(result[0].status).toBe('uncomplete');
    });
  });

  describe('getSubjectWithTeacherAndStudent', () => {
    const roster = {
      subject: { id: 's1', code: 'OLD', title: 'Math' },
      students: [{ id: 'sos1' }],
      teachers: [{ id: 'tos1' }],
    };
    let subjectReads: {
      subjectRoster: jest.Mock;
      subjectIdByCode: jest.Mock;
      forgetCode: jest.Mock;
    };

    beforeEach(() => {
      subjectReads = {
        subjectRoster: jest.fn().mockResolvedValue(roster),
        subjectIdByCode: jest.fn().mockResolvedValue('s1'),
        forgetCode: jest.fn().mockResolvedValue(undefined),
      };
      (service as any).subjectReads = subjectReads;
    });

    it('should return the cached subject with its students and teachers', async () => {
      const result = await service.getSubjectWithTeacherAndStudent({
        subjectId: 's1',
      });

      expect(result).toEqual({
        id: 's1',
        code: 'OLD',
        title: 'Math',
        publicProgressToken: null,
        studentOnSubjects: [{ id: 'sos1' }],
        teacherOnSubjects: [{ id: 'tos1' }],
      });
      // Same key order as before caching: subject fields, then the two lists.
      expect(Object.keys(result)).toEqual([
        'id',
        'code',
        'title',
        'publicProgressToken',
        'studentOnSubjects',
        'teacherOnSubjects',
      ]);
      expect(subjectReads.subjectRoster).toHaveBeenCalledWith('s1');
      expect(subjectReads.subjectIdByCode).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if subject not found', async () => {
      subjectReads.subjectRoster.mockResolvedValue(null);

      await expect(
        service.getSubjectWithTeacherAndStudent({ subjectId: 's1' }),
      ).rejects.toThrow(new NotFoundException('Subject not found'));
    });

    it('should resolve a code through the cached code mapping', async () => {
      const result = await service.getSubjectWithTeacherAndStudent({
        code: 'OLD',
      });

      expect(result.id).toBe('s1');
      expect(subjectReads.subjectIdByCode).toHaveBeenCalledWith('OLD');
      expect(subjectReads.subjectRoster).toHaveBeenCalledWith('s1');
      expect(subjectReads.forgetCode).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for an unknown code without reading a roster', async () => {
      subjectReads.subjectIdByCode.mockResolvedValue(null);

      await expect(
        service.getSubjectWithTeacherAndStudent({ code: 'zzz' }),
      ).rejects.toThrow(new NotFoundException('Subject not found'));
      expect(subjectReads.subjectRoster).not.toHaveBeenCalled();
    });

    it('should never serve a roster whose code still differs after resolving the code again', async () => {
      subjectReads.subjectRoster.mockResolvedValue({
        ...roster,
        subject: { ...roster.subject, code: 'NEW' },
      });

      await expect(
        service.getSubjectWithTeacherAndStudent({ code: 'OLD' }),
      ).rejects.toThrow(new NotFoundException('Subject not found'));
      expect(subjectReads.forgetCode).toHaveBeenCalledTimes(1);
      expect(subjectReads.forgetCode).toHaveBeenCalledWith('OLD');
      expect(subjectReads.subjectIdByCode).toHaveBeenCalledTimes(2);
    });

    it('should not read the subject, students or teachers through repositories', async () => {
      await service.getSubjectWithTeacherAndStudent({ subjectId: 's1' });
      await service.getSubjectWithTeacherAndStudent({ code: 'OLD' });

      expect(service.subjectRepository.findUnique).not.toHaveBeenCalled();
      expect(
        (service as any).studentOnSubjectRepository.findMany,
      ).not.toHaveBeenCalled();
      expect(
        mockTeacherOnSubjectService.teacherOnSubjectRepository.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getSubjectWithTeacherAndStudent over the cache', () => {
    // A stand-in for the primary Prisma client: it answers from `subjects` and
    // applies `select` and `omit` the way Prisma does.
    let subjects: Record<string, unknown>[];
    let cache: CacheService;
    let reads: SubjectReads;

    const prismaRow = (row: Record<string, unknown> | undefined, args: any) => {
      if (!row) return null;
      if (args.select) return { id: row.id };
      return Object.fromEntries(
        Object.entries(row).filter(([key]) => !args.omit?.[key]),
      );
    };
    const codeLookups = (code: string) =>
      mockPrismaService.subject.findUnique.mock.calls.filter(
        ([args]) => args.where.code === code,
      );
    const changeCode = async (rows: Record<string, unknown>[]) => {
      subjects = rows;
      // A Subject write bumps that subject's roster.
      await cache.bump(subjectScope('s1', 'roster'));
    };

    beforeEach(() => {
      subjects = [{ id: 's1', code: 'OLD', verifyLineToken: 'secret-token' }];
      mockPrismaService.subject.findUnique.mockImplementation(async (args) =>
        prismaRow(
          subjects.find((s) =>
            args.where.id ? s.id === args.where.id : s.code === args.where.code,
          ),
          args,
        ),
      );
      mockPrismaService.studentOnSubject.findMany.mockImplementation(
        async (args) => [{ id: `sos-${args.where.subjectId}` }],
      );
      mockPrismaService.teacherOnSubject.findMany.mockImplementation(
        async (args) => [{ id: `tos-${args.where.subjectId}` }],
      );
      ({ cache } = createTestCache());
      reads = new SubjectReads(mockPrismaService as any, cache);
      (service as any).subjectReads = reads;
    });

    afterEach(() => {
      mockPrismaService.subject.findUnique.mockReset();
      mockPrismaService.studentOnSubject.findMany.mockReset();
      mockPrismaService.teacherOnSubject.findMany.mockReset();
    });

    it('should look the code up in Prisma once across two calls', async () => {
      const first = await service.getSubjectWithTeacherAndStudent({
        code: 'OLD',
      });
      const second = await service.getSubjectWithTeacherAndStudent({
        code: 'OLD',
      });

      expect(second).toEqual(first);
      expect(first).toMatchObject({ id: 's1', code: 'OLD' });
      expect(codeLookups('OLD')).toEqual([
        [{ where: { code: 'OLD' }, select: { id: true } }],
      ]);
      // The roster is read once too.
      expect(mockPrismaService.subject.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.studentOnSubject.findMany).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should forget a cached code the subject no longer has, then return 404 for it', async () => {
      const forgetCode = jest.spyOn(reads, 'forgetCode');
      await service.getSubjectWithTeacherAndStudent({ code: 'OLD' });
      await changeCode([
        { id: 's1', code: 'NEW', verifyLineToken: 'secret-token' },
      ]);

      await expect(
        service.getSubjectWithTeacherAndStudent({ code: 'OLD' }),
      ).rejects.toThrow(new NotFoundException('Subject not found'));
      expect(forgetCode).toHaveBeenCalledWith('OLD');
      // The cached OLD -> s1 mapping was dropped and OLD was looked up again.
      expect(codeLookups('OLD')).toHaveLength(2);
    });

    it('should serve the subject by its new code', async () => {
      await service.getSubjectWithTeacherAndStudent({ code: 'OLD' });
      await changeCode([
        { id: 's1', code: 'NEW', verifyLineToken: 'secret-token' },
      ]);
      await expect(
        service.getSubjectWithTeacherAndStudent({ code: 'OLD' }),
      ).rejects.toThrow(NotFoundException);

      const result = await service.getSubjectWithTeacherAndStudent({
        code: 'NEW',
      });

      expect(result).toMatchObject({
        id: 's1',
        code: 'NEW',
        studentOnSubjects: [{ id: 'sos-s1' }],
        teacherOnSubjects: [{ id: 'tos-s1' }],
      });
    });

    it('should serve the subject that now holds a code another subject gave up', async () => {
      await service.getSubjectWithTeacherAndStudent({ code: 'OLD' });
      await changeCode([
        { id: 's1', code: 'NEW', verifyLineToken: null },
        { id: 's2', code: 'OLD', verifyLineToken: null },
      ]);

      const result = await service.getSubjectWithTeacherAndStudent({
        code: 'OLD',
      });

      expect(result).toMatchObject({
        id: 's2',
        code: 'OLD',
        studentOnSubjects: [{ id: 'sos-s2' }],
        teacherOnSubjects: [{ id: 'tos-s2' }],
      });
    });

    it('should not return verifyLineToken in this unauthenticated response', async () => {
      for (const dto of [{ code: 'OLD' }, { subjectId: 's1' }]) {
        const result = await service.getSubjectWithTeacherAndStudent(dto);

        expect(result).toMatchObject({ id: 's1', code: 'OLD' });
        expect(result).not.toHaveProperty('verifyLineToken');
      }
    });
  });

  describe('subject roster cache wiring', () => {
    afterEach(() => {
      mockPrismaService.subject.findUnique.mockReset();
      mockPrismaService.studentOnSubject.findMany.mockReset();
      mockPrismaService.teacherOnSubject.findMany.mockReset();
    });

    it('builds its subject reads on the primary Prisma client', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        code: 'OLD',
      });
      mockPrismaService.studentOnSubject.findMany.mockResolvedValue([
        { id: 'sos1' },
      ]);
      mockPrismaService.teacherOnSubject.findMany.mockResolvedValue([
        { id: 'tos1' },
      ]);

      const result = await service.getSubjectWithTeacherAndStudent({
        subjectId: 's1',
      });

      expect(result).toEqual({
        id: 's1',
        code: 'OLD',
        publicProgressToken: null,
        studentOnSubjects: [{ id: 'sos1' }],
        teacherOnSubjects: [{ id: 'tos1' }],
      });
      expect(mockPrismaService.subject.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
        omit: { verifyLineToken: true, publicProgressToken: true },
      });
      expect(mockPrismaService.studentOnSubject.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        orderBy: { order: 'asc' },
      });
    });

    it('never returns the public progress token (route is unauthenticated)', async () => {
      // The mock ignores omit, so this also proves the service strips it.
      mockPrismaService.subject.findUnique.mockImplementation(async (args) =>
        args.where.code
          ? { id: 's1' }
          : { id: 's1', code: 'ABC123', publicProgressToken: 'a'.repeat(32) },
      );
      mockPrismaService.studentOnSubject.findMany.mockResolvedValue([]);
      mockPrismaService.teacherOnSubject.findMany.mockResolvedValue([]);

      const result = await service.getSubjectWithTeacherAndStudent({
        code: 'ABC123',
      });
      expect(result.publicProgressToken).toBeNull();
    });
  });

  describe('createSubject', () => {
    it('should throw NotFoundException if school not found', async () => {
      mockSchoolService.schoolRepository.getById.mockResolvedValue(null);
      service['userRepository'].findById = jest.fn().mockResolvedValue({
        id: 'u1',
        firstName: 'Jane',
        lastName: 'Doe',
        photo: 'pic.jpg',
        email: 'jane.doe@example.com',
        phone: '1234567890',
      });
      await expect(
        service.createSubject({ schoolId: 'sch1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create subject', async () => {
      mockSchoolService.schoolRepository.getById.mockResolvedValue({
        id: 'sch1',
      });
      service['userRepository'].findById = jest.fn().mockResolvedValue({
        id: 'u1',
        firstName: 'Jane',
        lastName: 'Doe',
        photo: 'pic.jpg',
        email: 'jane.doe@example.com',
        phone: '1234567890',
      });
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([]);
      mockSchoolService.ValidateLimit.mockResolvedValue(true);
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue({
        schoolId: 'sch1',
      });
      mockClassService.classRepository.findById.mockResolvedValue({
        id: 'c1',
        schoolId: 'sch1',
      });
      mockClassService.validateAccess.mockResolvedValue(true);

      (service as any).studentRepository.findByClassId.mockResolvedValue([
        { id: 'st1', title: 'Mr' },
      ]);
      (service.subjectRepository.createSubject as jest.Mock).mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      (service as any).studentOnSubjectRepository.createMany.mockResolvedValue(
        {},
      );
      mockPrismaService.teacherOnSubject.create.mockResolvedValue({});
      mockGradeService.gradeRepository.create.mockResolvedValue({});
      mockWheelOfNameService.create.mockResolvedValue({
        data: { path: 'path' },
      });
      (service.subjectRepository.update as jest.Mock).mockResolvedValue({
        id: 's1',
      });

      const result = await service.createSubject(
        { schoolId: 'sch1', classId: 'c1', title: 'Math' } as any,
        { id: 'u1' } as any,
      );

      expect(service.subjectRepository.createSubject).toHaveBeenCalled();
      expect(
        (service as any).scoreOnSubjectRepository.createSocreOnSubject,
      ).toHaveBeenCalled(); // Should be called 5 times for defaults
      expect(result.id).toBe('s1');
      expect((service as any).cache.bump).toHaveBeenCalledWith(
        subjectScope('s1', 'roster'),
      );
    });

    const arrangeCreateSubject = ({
      country,
      level,
    }: {
      country: string | null;
      level: string;
    }) => {
      mockSchoolService.schoolRepository.getById.mockResolvedValue({
        id: 'sch1',
        country,
      });
      service['userRepository'].findById = jest.fn().mockResolvedValue({
        id: 'u1',
        firstName: 'Jane',
        lastName: 'Doe',
        photo: 'pic.jpg',
        email: 'jane.doe@example.com',
        phone: '1234567890',
      });
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([]);
      mockSchoolService.ValidateLimit.mockResolvedValue(true);
      (findFirstMemberOnSchoolByUser as jest.Mock).mockResolvedValue({
        schoolId: 'sch1',
      });
      mockClassService.classRepository.findById.mockResolvedValue({
        id: 'c1',
        schoolId: 'sch1',
        title: 'ครูข้าว',
        level,
      });
      mockClassService.validateAccess.mockResolvedValue(true);
      (service as any).studentRepository.findByClassId.mockResolvedValue([]);
      (service.subjectRepository.createSubject as jest.Mock).mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
        title: 'Math',
      });
      mockPrismaService.teacherOnSubject.create.mockResolvedValue({});
      mockGradeService.gradeRepository.create.mockResolvedValue({});
      mockWheelOfNameService.create.mockResolvedValue({
        data: { path: 'path' },
      });
      (service.subjectRepository.update as jest.Mock).mockResolvedValue({
        id: 's1',
      });
      mockAttendanceTableService.attendanceTableRepository.createAttendanceTable.mockImplementation(
        async (request) => ({ id: `table:${request.title}`, ...request }),
      );
    };

    const createMath = () =>
      service.createSubject(
        { schoolId: 'sch1', classId: 'c1', title: 'Math' } as any,
        { id: 'u1' } as any,
      );

    const createdScores = () =>
      (
        service as any
      ).scoreOnSubjectRepository.createSocreOnSubject.mock.calls.map(
        ([score]) => score,
      );

    const createdTables = () =>
      mockAttendanceTableService.attendanceTableRepository.createAttendanceTable.mock.calls.map(
        ([table]) => table,
      );

    const statusesCreatedOn = (tableTitle: string) =>
      mockAttendanceStatusListService.attendanceStatusListSRepository.create.mock.calls
        .map(([request]) => request.data)
        .filter((data) => data.attendanceTableId === `table:${tableTitle}`);

    it('should give a Thai school the 8 desirable characteristics as default scores', async () => {
      arrangeCreateSubject({
        country: 'Thailand',
        level: 'มัธยมศึกษาปีที่ 1/1',
      });

      await createMath();

      expect(createdScores().map((score) => score.title)).toEqual([
        'รักชาติ ศาสน์ กษัตริย์',
        'ซื่อสัตย์สุจริต',
        'มีวินัย',
        'ใฝ่เรียนรู้',
        'อยู่อย่างพอเพียง',
        'มุ่งมั่นในการทำงาน',
        'รักความเป็นไทย',
        'มีจิตสาธารณะ',
      ]);
      for (const score of createdScores()) {
        expect(score).toEqual(
          expect.objectContaining({
            score: 1,
            subjectId: 's1',
            schoolId: 'sch1',
            icon: expect.stringMatching(
              /^https:\/\/storage\.tatugaschool\.com\//,
            ),
          }),
        );
      }
    });

    it('should give each Thai desirable characteristic its own icon', async () => {
      arrangeCreateSubject({
        country: 'Thailand',
        level: 'มัธยมศึกษาปีที่ 1/1',
      });

      await createMath();

      const scores = createdScores();
      expect(new Set(scores.map((score) => score.icon)).size).toBe(8);
      expect(new Set(scores.map((score) => score.blurHash)).size).toBe(8);
    });

    it.each(['thailand', '  THAILAND ', 'ประเทศไทย', 'ไทย'])(
      'should treat a school country of %p as Thailand',
      async (country) => {
        arrangeCreateSubject({ country, level: 'มัธยมศึกษาปีที่ 1/1' });

        await createMath();

        expect(createdScores().map((score) => score.title)).toContain(
          'มีจิตสาธารณะ',
        );
      },
    );

    it.each([null, 'Japan'])(
      'should keep the English default scores for a school in %p',
      async (country) => {
        arrangeCreateSubject({ country, level: 'Grade 7' });

        await createMath();

        expect(createdScores().map((score) => score.title)).toEqual([
          'Good Job',
          'Well Done',
          'Keep It Up',
          'Excellent',
          'Needs Improvement',
        ]);
      },
    );

    it('should give a Thai school a ตารางเข้าเรียน attendance table instead of Default', async () => {
      arrangeCreateSubject({
        country: 'Thailand',
        level: 'มัธยมศึกษาปีที่ 1/1',
      });

      await createMath();

      expect(createdTables()).toEqual([
        expect.objectContaining({
          title: 'ตารางเข้าเรียน',
          subjectId: 's1',
          schoolId: 'sch1',
        }),
      ]);
      expect(
        mockAttendanceTableService.createAttendanceTable,
      ).not.toHaveBeenCalled();
    });

    it.each([null, 'Japan'])(
      'should keep the English Default attendance table for a school in %p',
      async (country) => {
        arrangeCreateSubject({ country, level: 'Grade 7' });

        await createMath();

        expect(
          mockAttendanceTableService.createAttendanceTable,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Default', subjectId: 's1' }),
          { id: 'u1' },
        );
        expect(createdTables()).toEqual([]);
      },
    );

    it.each(['ประถมศึกษาปีที่ 6/1', 'Primary 3', 'primary 2/1'])(
      'should add milk, tooth-brushing and savings tables to a %p class',
      async (level) => {
        arrangeCreateSubject({ country: null, level });

        await createMath();

        expect(createdTables()).toEqual([
          expect.objectContaining({
            title: 'ตารางดื่มนม',
            subjectId: 's1',
            schoolId: 'sch1',
          }),
          expect.objectContaining({
            title: 'ตารางแปรงฟัน',
            subjectId: 's1',
            schoolId: 'sch1',
          }),
          expect.objectContaining({
            title: 'ตารางเงินออม',
            subjectId: 's1',
            schoolId: 'sch1',
          }),
        ]);
        expect(
          mockAttendanceTableService.createAttendanceTable,
        ).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Default', subjectId: 's1' }),
          { id: 'u1' },
        );
      },
    );

    it.each([
      [
        'ตารางเข้าเรียน',
        [
          { title: 'มาเรียน', value: 1 },
          { title: 'มาสาย', value: 1 },
          { title: 'ลาป่วย', value: 1 },
          { title: 'ขาดเรียน', value: -1 },
          { title: 'วันหยุด', value: 1 },
        ],
      ],
      [
        'ตารางดื่มนม',
        [
          { title: 'ดื่ม', value: 1 },
          { title: 'ไม่ดื่ม', value: 0 },
        ],
      ],
      [
        'ตารางแปรงฟัน',
        [
          { title: 'แปรงฟัน', value: 1 },
          { title: 'ไม่แปรงฟัน', value: 0 },
        ],
      ],
      [
        'ตารางเงินออม',
        [
          { title: '1 บาท', value: 1 },
          { title: '5 บาท', value: 5 },
          { title: '10 บาท', value: 10 },
          { title: '20 บาท', value: 20 },
          { title: '50 บาท', value: 50 },
          { title: '100 บาท', value: 100 },
        ],
      ],
    ])('should give %s its statuses', async (tableTitle, expected) => {
      arrangeCreateSubject({
        country: 'Thailand',
        level: 'ประถมศึกษาปีที่ 5/1',
      });

      await createMath();

      const statuses = statusesCreatedOn(tableTitle);
      expect(statuses.map(({ title, value }) => ({ title, value }))).toEqual(
        expected,
      );
      for (const status of statuses) {
        expect(status).toEqual(
          expect.objectContaining({
            subjectId: 's1',
            schoolId: 'sch1',
            color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
          }),
        );
      }
    });

    it.each(['มัธยมศึกษาปีที่ 1/1', 'Secondary 1', 'อนุบาล'])(
      'should not add tracking tables to a %p class',
      async (level) => {
        arrangeCreateSubject({ country: null, level });

        await createMath();

        expect(createdTables()).toEqual([]);
      },
    );
  });

  describe('verifyLineToken', () => {
    it('should verify line token and send message', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        verifyLineToken: 'token1',
      });
      (service.subjectRepository.update as jest.Mock).mockResolvedValue({
        id: 's1',
        lineGroupId: 'g1',
        title: 'Math',
      });

      const result = await service.verifyLineToken(
        { subjectId: 's1', token: 'token1', confirm: true },
        { id: 'u1' } as any,
      );

      expect(service.subjectRepository.update).toHaveBeenCalled();
      expect(mockLineBotService.sendMessage).toHaveBeenCalled();
      expect((result as any).id).toBe('s1');
    });

    it('should throw ForbiddenException if token is invalid', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        verifyLineToken: 'wrong',
      });

      await expect(
        service.verifyLineToken(
          { subjectId: 's1', token: 'token1', confirm: true },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should leave group line if confirm is false', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        lineGroupId: 'g1',
      });

      const leaveGroupLineSpy = jest
        .spyOn(service, 'leaveGroupLine')
        .mockResolvedValue(undefined);

      await service.verifyLineToken(
        { subjectId: 's1', token: 'token1', confirm: false },
        { id: 'u1' } as any,
      );

      expect(leaveGroupLineSpy).toHaveBeenCalledWith({ groupId: 'g1' });
    });
  });

  describe('updateSubject', () => {
    it('should throw NotFoundException if subject not found', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.updateSubject(
          { query: { subjectId: 's1' }, body: {} } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        isLocked: true,
      });
      await expect(
        service.updateSubject(
          { query: { subjectId: 's1' }, body: {} } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update subject successfully', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        classId: 'c1',
        isLocked: false,
      });
      mockClassService.validateAccess.mockResolvedValue(true);
      (service.subjectRepository.update as jest.Mock).mockResolvedValue({
        id: 's1',
        title: 'New',
      });

      const result = await service.updateSubject(
        {
          query: { subjectId: 's1' },
          body: { title: 'New', educationYear: '2024' },
        } as any,
        { id: 'u1' } as any,
      );
      expect(result.title).toBe('New');
      expect(service.subjectRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'New',
            educationYear: '2024',
          }),
        }),
      );
    });
  });

  describe('reorderSubjects', () => {
    it('should throw NotFoundException if subject not found', async () => {
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.reorderSubjects({ subjectIds: ['s1'] }, { id: 'u1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reorder subjects', async () => {
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      mockMemberOnSchoolService.validateAccess.mockResolvedValue(true);
      (
        service.subjectRepository.reorderSubjects as jest.Mock
      ).mockResolvedValue([{ id: 's1' }]);

      const result = await service.reorderSubjects({ subjectIds: ['s1'] }, {
        id: 'u1',
      } as any);
      expect(result.length).toBe(1);
      expect(service.subjectRepository.reorderSubjects).toHaveBeenCalled();
    });
  });

  describe('deleteSubject', () => {
    it('should throw ForbiddenException if subject is locked', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isLocked: true },
      );

      await expect(
        service.deleteSubject({ subjectId: 's1' }, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should logic delete the subject', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isLocked: false, isDeleted: false, schoolId: 'sch1' },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue({
        role: 'ADMIN',
      });
      (service.subjectRepository.update as jest.Mock).mockResolvedValue({
        id: 's1',
      });
      (
        service.subjectRepository.getTotalDeleteSize as jest.Mock
      ).mockResolvedValue(100);
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        limitSubjectNumber: 10,
      });
      (service.subjectRepository.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.deleteSubject({ subjectId: 's1' }, {
        id: 'u1',
      } as any);

      expect(service.subjectRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isDeleted: true } }),
      );
      expect(result.id).toBe('s1');
    });
  });

  describe('getAllSubjectData', () => {
    it('should throw NotFoundException if subject not found', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue(null);
      await expect(
        service.getAllSubjectData({ subjectId: 's1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return all subject data', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({ id: 's1' });

      const result = await service.getAllSubjectData({ subjectId: 's1' });
      expect(result.subject.data.id).toBe('s1');
      expect(result.attendanceTables).toBeDefined();
      expect(result.rubrics).toBeDefined();
      expect(result.rubricScoreOnStudentAssignments).toBeDefined();
      expect(result.announcements).toBeDefined();
      expect(result.fileOnAnnouncements).toBeDefined();
      expect(result.commentOnAnnouncements).toBeDefined();
    });
  });

  describe('reportPendingAssignments', () => {
    it('should return formatted report string', async () => {
      mockPrismaService.studentOnSubject.findMany.mockResolvedValue([
        {
          title: 'Mr',
          firstName: 'John',
          lastName: 'Doe',
          number: '1',
          studentOnAssignments: [{ id: 'a1' }, { id: 'a2' }],
        },
        {
          title: 'Ms',
          firstName: 'Jane',
          lastName: 'Smith',
          number: null,
          studentOnAssignments: [{ id: 'a3' }],
        },
      ]);

      const result = await service.reportPendingAssignments({
        id: 's1',
        title: 'Math',
      } as any);
      expect(result).toContain('📚 รายวิชา: Math');
      expect(result).toContain('สรุปงานค้างของนักเรียน:');
      expect(result).toContain('เลขที่ 1 MrJohn Doe: 2 งาน');
      expect(result).toContain('MsJane Smith: 1 งาน');
    });

    it('does not count work on soft-deleted assignments', async () => {
      mockPrismaService.studentOnSubject.findMany.mockResolvedValue([]);
      await service.reportPendingAssignments({
        id: 's1',
        title: 'Math',
      } as any);
      const args =
        mockPrismaService.studentOnSubject.findMany.mock.calls.at(-1)[0];
      expect(args.include.studentOnAssignments.where.assignment).toEqual({
        is: { status: 'Published', isDeleted: false },
      });
    });
  });
});
