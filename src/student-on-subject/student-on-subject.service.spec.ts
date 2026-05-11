import { Test, TestingModule } from '@nestjs/testing';
import { StudentOnSubjectService } from './student-on-subject.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { SchoolService } from '../school/school.service';
import { GradeService } from '../grade/grade.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('StudentOnSubjectService', () => {
  let service: StudentOnSubjectService;

  const mockPrismaService = {
    student: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
    teacherOnSubjectRepository: { findMany: jest.fn() },
  };

  const mockSchoolService = {
    schoolRepository: { findUnique: jest.fn() },
  };

  const mockWheelOfNameService = {
    update: jest.fn().mockResolvedValue(true),
  };

  const mockGradeService = {
    gradeRepository: { findUnique: jest.fn() },
    assignGrade: jest.fn().mockResolvedValue({ grade: 'A' }),
  };

  const mockSkillOnStudentAssignmentService = {
    getByStudentOnSubjectId: jest.fn(),
  };

  const mockScoreOnSubjectService = {
    scoreOnSubjectRepository: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentOnSubjectService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: {} },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: WheelOfNameService, useValue: mockWheelOfNameService },
        { provide: SchoolService, useValue: mockSchoolService },
        { provide: GradeService, useValue: mockGradeService },
        {
          provide: SkillOnStudentAssignmentService,
          useValue: mockSkillOnStudentAssignmentService,
        },
        { provide: ScoreOnSubjectService, useValue: mockScoreOnSubjectService },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<StudentOnSubjectService>(StudentOnSubjectService);

    service.studentOnSubjectRepository = {
      getStudentOnSubjectById: jest.fn(),
      findMany: jest.fn(),
      updateStudentOnSubject: jest.fn(),
      getStudentOnSubjectsByStudentId: jest.fn(),
      createStudentOnSubject: jest.fn(),
      delete: jest.fn(),
    } as any;

    (service as any).subjectRepository = {
      findUnique: jest.fn(),
      getSubjectById: jest.fn(),
    };

    (service as any).studentRepository = {
      findById: jest.fn(),
    };

    (service as any).classRepository = {
      findById: jest.fn(),
    };

    (service as any).userRepository = {
      findById: jest.fn(),
    };

    (service as any).attendanceRepository = {
      findMany: jest.fn(),
    };

    (service as any).attendanceRowRepository = {
      findMany: jest.fn(),
    };

    (service as any).assignmentRepository = {
      findMany: jest.fn(),
    };

    (service as any).studentOnAssignmentRepository = {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    };

    (service as any).scoreOnStudentRepository = {
      findMany: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStudentOnSubjectsBySubjectId', () => {
    it('should return student on subjects', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.studentOnSubjectRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'sos1' }]);

      const result = await service.getStudentOnSubjectsBySubjectId(
        { subjectId: 's1' },
        { id: 'u1' } as any,
      );

      expect(service.studentOnSubjectRepository.findMany).toHaveBeenCalled();
      expect(result[0].id).toBe('sos1');
    });
  });

  describe('update', () => {
    it('should update student on subject', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'sos1', subjectId: 's1' });
      (service as any).subjectRepository.getSubjectById.mockResolvedValue({
        id: 's1',
        wheelOfNamePath: null,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.studentOnSubjectRepository.updateStudentOnSubject as jest.Mock
      ).mockResolvedValue({ id: 'sos1', isActive: false });

      const result = await service.update(
        { query: { id: 'sos1' }, data: { isActive: false } } as any,
        { id: 'u1' } as any,
      );

      expect(
        (service as any).studentOnAssignmentRepository.updateMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isAssigned: false } }),
      );
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if subject not found', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'sos1', subjectId: 's1' });
      (service as any).subjectRepository.getSubjectById.mockResolvedValue(null);

      await expect(
        service.update({ query: { id: 'sos1' }, data: {} } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createStudentOnSubject', () => {
    it('should create student on subject', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockPrismaService.student.findUnique.mockResolvedValue({
        id: 'st1',
        classId: 'c1',
        schoolId: 'sch1',
      });
      (
        service.studentOnSubjectRepository.createStudentOnSubject as jest.Mock
      ).mockResolvedValue({ id: 'sos1' });

      const result = await service.createStudentOnSubject(
        { studentId: 'st1', subjectId: 's1' },
        { id: 'u1' } as any,
      );

      expect(
        service.studentOnSubjectRepository.createStudentOnSubject,
      ).toHaveBeenCalled();
      expect(result.id).toBe('sos1');
    });

    it('should throw NotFoundException if student not found', async () => {
      mockPrismaService.student.findUnique.mockResolvedValue(null);

      await expect(
        service.createStudentOnSubject(
          { studentId: 'st1', subjectId: 's1' },
          {} as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteStudentOnSubject', () => {
    it('should delete student on subject', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'sos1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.studentOnSubjectRepository.delete as jest.Mock
      ).mockResolvedValue({ id: 'sos1' });

      const result = await service.deleteStudentOnSubject(
        { studentOnSubjectId: 'sos1' },
        { id: 'u1' } as any,
      );

      expect(service.studentOnSubjectRepository.delete).toHaveBeenCalledWith({
        studentOnSubjectId: 'sos1',
      });
      expect(result.id).toBe('sos1');
    });
  });

  describe('getSummaryData', () => {
    it('should return report data', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({
        id: 'sos1',
        subjectId: 's1',
        studentId: 'st1',
        schoolId: 'sch1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        title: 'School 1',
      });
      (service as any).subjectRepository.findUnique.mockResolvedValue({
        id: 's1',
        title: 'Math',
      });
      (service as any).studentRepository.findById.mockResolvedValue({
        id: 'st1',
        classId: 'c1',
      });
      (service as any).classRepository.findById.mockResolvedValue({
        id: 'c1',
        level: '1',
        title: 'A',
      });
      mockTeacherOnSubjectService.teacherOnSubjectRepository.findMany.mockResolvedValue(
        [],
      );

      (service as any).attendanceRepository.findMany.mockResolvedValue([]);
      (service as any).attendanceRowRepository.findMany.mockResolvedValue([]);
      mockGradeService.gradeRepository.findUnique.mockResolvedValue(null);
      (service as any).assignmentRepository.findMany.mockResolvedValue([]);
      mockSkillOnStudentAssignmentService.getByStudentOnSubjectId.mockResolvedValue(
        [],
      );

      jest.spyOn(service, 'getGradeOnStudent').mockResolvedValue({
        grade: 'A',
        totalScore: 100,
        scoreOnStudents: [],
        studentOnAssignments: [],
      });

      const result = await service.getSummaryData(
        { studentOnSubjectId: 'sos1' },
        { id: 'u1' } as any,
      );

      expect(result.schoolName).toBe('School 1');
      expect(result.courseInfo.subject).toBe('Math');
      expect(result.academicPerformance.overallGrade).toBe('A');
    });
  });
});
