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
  };

  const mockWheelOfNameService = {
    get: jest.fn(),
    create: jest.fn(),
  };

  const mockAttendanceTableService = {
    createAttendanceTable: jest.fn(),
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
    gradeRepository: { create: jest.fn(), findUnique: jest.fn() },
    assignGrade: jest.fn(),
  };

  const mockAssignmentService = {
    assignmentRepository: { findMany: jest.fn() },
  };

  const mockAttendanceStatusListService = {
    attendanceStatusListSRepository: { findMany: jest.fn() },
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
        { provide: FileAssignmentService, useValue: {} },
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
    };

    (service as any).studentRepository = {
      findById: jest.fn(),
      findByClassId: jest.fn(),
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

  describe('getSubjectById', () => {
    it('should return subject', async () => {
      (service.subjectRepository.getSubjectById as jest.Mock).mockResolvedValue(
        { id: 's1', isDeleted: false },
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
  });

  describe('createSubject', () => {
    it('should throw NotFoundException if school not found', async () => {
      mockSchoolService.schoolRepository.getById.mockResolvedValue(null);

      await expect(
        service.createSubject({ schoolId: 'sch1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create subject', async () => {
      mockSchoolService.schoolRepository.getById.mockResolvedValue({
        id: 'sch1',
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

      // Mock scoreOnSubjectRepository directly
      (service as any).scoreOnSubjectRepository = {
        createSocreOnSubject: jest.fn(),
      };

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
});
