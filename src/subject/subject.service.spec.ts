import { Test, TestingModule } from '@nestjs/testing';
import { SubjectService } from './subject.service';
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
    teacherOnSubject: { create: jest.fn() },
    questionOnVideo: { findMany: jest.fn(), create: jest.fn() },
    studentOnSubject: { findMany: jest.fn() },
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
  });

  describe('getBySchoolId', () => {
    it('should throw ForbiddenException if memberOnSchool not found', async () => {
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue(null);
      await expect(
        service.getBySchoolId({ schoolId: 'sch1', educationYear: '2024' }, {
          id: 'u1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return subjects', async () => {
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
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
    it('should throw NotFoundException if subject not found', async () => {
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.getSubjectWithTeacherAndStudent({ subjectId: 's1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return subject with teachers and students', async () => {
      (service.subjectRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 's1',
      });
      (service as any).studentOnSubjectRepository.findMany.mockResolvedValue([
        { id: 'st1' },
      ]);
      mockTeacherOnSubjectService.teacherOnSubjectRepository.findMany.mockResolvedValue(
        [{ id: 't1' }],
      );

      const result = await service.getSubjectWithTeacherAndStudent({
        subjectId: 's1',
      });
      expect(result.id).toBe('s1');
      expect(result.studentOnSubjects.length).toBe(1);
      expect(result.teacherOnSubjects.length).toBe(1);
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
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
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
    });
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
  });
});
