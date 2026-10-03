import { CacheService } from '../cache/cache.service';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';
import { subjectScope } from '../cache/cache-scopes';
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
    studentOnSubject: { update: jest.fn(), findMany: jest.fn() },
    subject: { findUnique: jest.fn() },
    teacherOnSubject: { findMany: jest.fn() },
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
        { provide: CacheService, useValue: createPassthroughCache() },
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
      update: jest.fn(),
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
    const dto = { subjectId: 's1' };
    const user: any = { id: 'u1' };
    const students = [
      { id: 'sos1', order: 1 },
      { id: 'sos2', order: 2 },
    ];
    let subjectReads: { subjectRoster: jest.Mock };

    beforeEach(() => {
      subjectReads = {
        subjectRoster: jest.fn().mockResolvedValue({
          subject: { id: 's1' },
          students,
          teachers: [{ id: 'tos1' }],
        }),
      };
      (service as any).subjectReads = subjectReads;
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue({
        id: 'tos1',
        status: 'ACCEPT',
      });
    });

    afterEach(() => {
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
    });

    it("should return the cached roster's students", async () => {
      const result = await service.getStudentOnSubjectsBySubjectId(dto, user);

      expect(result).toEqual(students);
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(subjectReads.subjectRoster).toHaveBeenCalledWith('s1');
    });

    it('should authorize on every request, before reading the cached roster', async () => {
      await service.getStudentOnSubjectsBySubjectId(dto, user);
      await service.getStudentOnSubjectsBySubjectId(dto, user);

      const access = mockTeacherOnSubjectService.ValidateAccess.mock;
      const read = subjectReads.subjectRoster.mock;
      expect(access.calls).toHaveLength(2);
      expect(read.calls).toHaveLength(2);
      for (const i of [0, 1]) {
        expect(access.invocationCallOrder[i]).toBeLessThan(
          read.invocationCallOrder[i],
        );
      }
    });

    it('should not read the cached roster when the access check rejects', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException("You're not a teacher on this subject"),
      );

      await expect(
        service.getStudentOnSubjectsBySubjectId(dto, user),
      ).rejects.toThrow(ForbiddenException);
      expect(subjectReads.subjectRoster).not.toHaveBeenCalled();
    });

    it('should return an empty list when the subject has no roster', async () => {
      subjectReads.subjectRoster.mockResolvedValue(null);

      expect(await service.getStudentOnSubjectsBySubjectId(dto, user)).toEqual(
        [],
      );
    });

    it('should not read students through the repository', async () => {
      await service.getStudentOnSubjectsBySubjectId(dto, user);

      expect(
        service.studentOnSubjectRepository.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('roster cache wiring', () => {
    afterEach(() => {
      mockPrismaService.subject.findUnique.mockReset();
      mockPrismaService.studentOnSubject.findMany.mockReset();
      mockPrismaService.teacherOnSubject.findMany.mockReset();
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
    });

    it('builds its subject reads on the primary Prisma client, students ordered by order', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(
        'admin-school',
      );
      mockPrismaService.subject.findUnique.mockResolvedValue({ id: 's1' });
      mockPrismaService.studentOnSubject.findMany.mockResolvedValue([
        { id: 'sos1' },
      ]);
      mockPrismaService.teacherOnSubject.findMany.mockResolvedValue([]);

      const result = await service.getStudentOnSubjectsBySubjectId(
        { subjectId: 's1' },
        { id: 'u1' } as any,
      );

      expect(result).toEqual([{ id: 'sos1' }]);
      expect(mockPrismaService.studentOnSubject.findMany).toHaveBeenCalledWith({
        where: { subjectId: 's1' },
        orderBy: { order: 'asc' },
      });
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
        's1',
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

    it('should update student photo and blurHash when both are provided', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'sos1', subjectId: 's1', studentId: 'st1' });
      (service as any).subjectRepository.getSubjectById.mockResolvedValue({
        id: 's1',
        wheelOfNamePath: null,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.studentOnSubjectRepository.updateStudentOnSubject as jest.Mock
      ).mockResolvedValue({ id: 'sos1' });
      (service as any).studentRepository.update.mockResolvedValue({
        id: 'st1',
      });

      await service.update(
        {
          query: { id: 'sos1' },
          data: {
            photo: 'https://example.com/p.png',
            blurHash: 'LKO2?U%2Tw=w',
          },
        } as any,
        { id: 'u1' } as any,
      );

      expect((service as any).studentRepository.update).toHaveBeenCalledWith({
        query: { studentId: 'st1' },
        body: {
          photo: 'https://example.com/p.png',
          blurHash: 'LKO2?U%2Tw=w',
        },
      });
    });

    it('should not update student when only photo is provided', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'sos1', subjectId: 's1', studentId: 'st1' });
      (service as any).subjectRepository.getSubjectById.mockResolvedValue({
        id: 's1',
        wheelOfNamePath: null,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.studentOnSubjectRepository.updateStudentOnSubject as jest.Mock
      ).mockResolvedValue({ id: 'sos1' });

      await service.update(
        {
          query: { id: 'sos1' },
          data: { photo: 'https://example.com/p.png' },
        } as any,
        { id: 'u1' } as any,
      );

      expect((service as any).studentRepository.update).not.toHaveBeenCalled();
    });

    it('should refresh wheel of name when subject has wheelOfNamePath and isActive is true', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'sos1', subjectId: 's1' });
      (service as any).subjectRepository.getSubjectById.mockResolvedValue({
        id: 's1',
        title: 'Math',
        description: 'desc',
        wheelOfNamePath: '/wheel/abc',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.studentOnSubjectRepository.updateStudentOnSubject as jest.Mock
      ).mockResolvedValue({ id: 'sos1', isActive: true });
      (
        service.studentOnSubjectRepository.findMany as jest.Mock
      ).mockResolvedValue([
        { title: 'Mr.', firstName: 'John', lastName: 'Doe' },
      ]);

      await service.update(
        { query: { id: 'sos1' }, data: { isActive: true } } as any,
        { id: 'u1' } as any,
      );

      expect(mockWheelOfNameService.update).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/wheel/abc',
          title: 'Math',
          description: 'desc',
          texts: [{ text: 'Mr. John Doe' }],
        }),
      );
    });

    it('should not refresh wheel of name when subject has no wheelOfNamePath', async () => {
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
      ).mockResolvedValue({ id: 'sos1', isActive: true });

      await service.update(
        { query: { id: 'sos1' }, data: { isActive: true } } as any,
        { id: 'u1' } as any,
      );

      expect(mockWheelOfNameService.update).not.toHaveBeenCalled();
    });
  });

  describe('getStudentOnSubjectById', () => {
    it('should return the student on subject', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue({ id: 'sos1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      const result = await service.getStudentOnSubjectById(
        { studentOnSubjectId: 'sos1' },
        { id: 'u1' } as any,
      );

      expect(result.id).toBe('sos1');
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
    });

    it('should throw NotFoundException if not found', async () => {
      (
        service.studentOnSubjectRepository.getStudentOnSubjectById as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.getStudentOnSubjectById({ studentOnSubjectId: 'sos1' }, {
          id: 'u1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStudentOnSubjectsByStudentId', () => {
    it('should return [] when student has no subjects', async () => {
      (
        service.studentOnSubjectRepository
          .getStudentOnSubjectsByStudentId as jest.Mock
      ).mockResolvedValue([]);

      const result = await service.getStudentOnSubjectsByStudentId(
        { studentId: 'st1' } as any,
        { id: 'u1' } as any,
      );

      expect(result).toEqual([]);
      expect(mockTeacherOnSubjectService.ValidateAccess).not.toHaveBeenCalled();
    });

    it('should validate access against the first subject and return results', async () => {
      (
        service.studentOnSubjectRepository
          .getStudentOnSubjectsByStudentId as jest.Mock
      ).mockResolvedValue([
        { id: 'sos1', subjectId: 's1' },
        { id: 'sos2', subjectId: 's2' },
      ]);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      const result = await service.getStudentOnSubjectsByStudentId(
        { studentId: 'st1' } as any,
        { id: 'u1' } as any,
      );

      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(result).toHaveLength(2);
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

  describe('sortStudentOnSubjects', () => {
    it('bumps roster after reordering', async () => {
      (
        service.studentOnSubjectRepository.findMany as jest.Mock
      ).mockResolvedValue([
        { id: 'sos1', subjectId: 's1' },
        { id: 'sos2', subjectId: 's1' },
      ]);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockPrismaService.studentOnSubject.update.mockImplementation(
        async ({ where }) => ({ id: where.id }),
      );

      const result = await service.sortStudentOnSubjects(
        { studentOnSubjectIds: ['sos2', 'sos1'] } as any,
        { id: 'u1' } as any,
      );

      expect(result).toHaveLength(2);
      expect((service as any).cache.bump).toHaveBeenCalledWith(
        subjectScope('s1', 'roster'),
      );
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
