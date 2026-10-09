import { CacheService } from '../cache/cache.service';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';
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
import {
  fullQuizAttempt,
  leakedIntegrityKeys,
} from '../quiz/testing/quiz-attempt.fixture';

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
    studentOnAssignment: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'sa1', assignment: { isDeleted: false } }),
    },
    fileOnStudentAssignment: { findMany: jest.fn() },
    subject: { findUnique: jest.fn() },
    school: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockNotificationService = {
    createNotifications: jest.fn().mockResolvedValue(undefined),
  };

  const mockLineBotService = {
    sendMessage: jest.fn().mockResolvedValue(undefined),
  };

  const mockSkillOnStudentAssignmentService = {
    suggestCreate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: CacheService, useValue: createPassthroughCache() },
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

    it('strips integrity and risk data from the quiz attempt', async () => {
      const attempt = fullQuizAttempt();
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({
        id: 'sa1',
        studentId: 'st1',
        quizAttempt: attempt,
      });

      const result = await service.getById({ id: 'sa1' }, { id: 'st1' } as any);

      expect(leakedIntegrityKeys(result)).toEqual([]);
      expect(result.quizAttempt).toEqual({
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        submittedAt: attempt.submittedAt,
      });
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
    const user = { id: 'u1' } as any;
    const dto = { assignmentId: 'a1' };
    let refs: { assignment: jest.Mock };
    let reads: {
      subjectAssignments: jest.Mock;
      assignmentSubmissions: jest.Mock;
    };

    beforeEach(() => {
      refs = {
        assignment: jest
          .fn()
          .mockResolvedValue({ subjectId: 's1', schoolId: 'sch1' }),
      };
      reads = {
        subjectAssignments: jest.fn().mockResolvedValue({
          assignments: [{ id: 'a1', subjectId: 's1' }],
          files: [],
          questions: [],
        }),
        assignmentSubmissions: jest.fn().mockResolvedValue([]),
      };
      (service as any).refs = refs;
      (service as any).reads = reads;
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue({
        id: 'ts1',
        status: 'ACCEPT',
      });
    });

    afterEach(() => {
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
    });

    it('should return student on assignments with files from the cache unit', async () => {
      const rows = [
        {
          id: 'sa1',
          assignmentId: 'a1',
          files: [{ id: 'f1', studentOnAssignmentId: 'sa1' }],
        },
      ];
      reads.assignmentSubmissions.mockResolvedValue(rows);

      const result = await service.getByAssignmentId(dto, user);

      expect(result).toEqual(rows);
      expect(refs.assignment).toHaveBeenCalledWith('a1');
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(reads.subjectAssignments).toHaveBeenCalledWith('s1');
      expect(reads.assignmentSubmissions).toHaveBeenCalledWith('s1', 'a1');
    });

    it('should authorize on every request, before reading cached subject data', async () => {
      await service.getByAssignmentId(dto, user);
      await service.getByAssignmentId(dto, user);

      const access = mockTeacherOnSubjectService.ValidateAccess.mock;
      const firstRead = reads.subjectAssignments.mock;
      expect(access.calls).toHaveLength(2);
      expect(firstRead.calls).toHaveLength(2);
      for (const i of [0, 1]) {
        expect(access.invocationCallOrder[i]).toBeLessThan(
          firstRead.invocationCallOrder[i],
        );
      }
    });

    it('should throw NotFoundException for an unknown assignment', async () => {
      refs.assignment.mockResolvedValue(null);

      await expect(service.getByAssignmentId(dto, user)).rejects.toThrow(
        NotFoundException,
      );
      expect(refs.assignment).toHaveBeenCalledWith('a1');
      expect(mockTeacherOnSubjectService.ValidateAccess).not.toHaveBeenCalled();
      expect(reads.assignmentSubmissions).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for a deleted assignment whose ref is still cached', async () => {
      reads.subjectAssignments.mockResolvedValue({
        assignments: [{ id: 'a2', subjectId: 's1' }],
        files: [],
        questions: [],
      });

      await expect(service.getByAssignmentId(dto, user)).rejects.toThrow(
        NotFoundException,
      );
      expect(reads.subjectAssignments).toHaveBeenCalledWith('s1');
      expect(reads.assignmentSubmissions).not.toHaveBeenCalled();
    });

    it('should refuse a teacher whose access check rejects (e.g. invite not accepted)', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException("You're not a teacher on this subject"),
      );

      await expect(service.getByAssignmentId(dto, user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(reads.subjectAssignments).not.toHaveBeenCalled();
      expect(reads.assignmentSubmissions).not.toHaveBeenCalled();
    });

    it('should not read assignments, members or teachers through repositories', async () => {
      await service.getByAssignmentId(dto, user);

      expect(
        (service as any).assignmentRepository.getById,
      ).not.toHaveBeenCalled();
      expect(
        (service as any).memberOnSchoolRepository
          .getMemberOnSchoolByUserIdAndSchoolId,
      ).not.toHaveBeenCalled();
      expect(
        (service as any).teacherOnSubjectRepository.getByTeacherIdAndSubjectId,
      ).not.toHaveBeenCalled();
      expect(
        service.studentOnAssignmentRepository.getByAssignmentId,
      ).not.toHaveBeenCalled();
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

    it('should not produce an unhandled rejection when suggestCreate rejects', async () => {
      const dto: any = {
        query: { studentOnAssignmentId: 'sa1' },
        body: { score: 5 },
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
      mockSkillOnStudentAssignmentService.suggestCreate.mockRejectedValue(
        new BadRequestException(
          'This skill on student assignment already exists',
        ),
      );

      let unhandled: unknown = null;
      const listener = (reason: unknown) => {
        unhandled = reason;
      };
      process.on('unhandledRejection', listener);

      const result = await service.update(dto, { id: 'u1' } as any);
      await new Promise((resolve) => setImmediate(resolve));

      process.removeListener('unhandledRejection', listener);

      expect(result.id).toBe('sa1');
      expect(unhandled).toBeNull();
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

    it('strips integrity and risk data when a student patches', async () => {
      const dto: any = {
        query: { studentOnAssignmentId: 'sa1' },
        body: { body: 'my answer' },
      };
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({
        id: 'sa1',
        assignmentId: 'a1',
        subjectId: 's1',
        studentId: 'st1',
        isAssigned: true,
        status: 'PENDDING',
      });
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        maxScore: 10,
        type: 'Assignment',
      });
      (
        service.studentOnAssignmentRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'sa1', quizAttempt: fullQuizAttempt() });

      const result = await service.update(dto, undefined, {
        id: 'st1',
        schoolId: 'sc1',
      } as any);

      expect(leakedIntegrityKeys(result)).toEqual([]);
    });

    it('keeps the full quiz attempt for a teacher patch', async () => {
      const dto: any = {
        query: { studentOnAssignmentId: 'sa1' },
        body: { status: 'PENDDING' },
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
      const attempt = fullQuizAttempt();
      (
        service.studentOnAssignmentRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'sa1', quizAttempt: attempt });

      const result = await service.update(dto, { id: 'u1' } as any);

      expect(result.quizAttempt).toEqual(attempt);
    });

    it('forbids students from patching a quiz submission directly', async () => {
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
        status: 'PENDDING',
      });
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        maxScore: 10,
        type: 'Quiz',
      });

      await expect(
        service.update(dto, undefined, { id: 'st1', schoolId: 'sc1' } as any),
      ).rejects.toThrow(ForbiddenException);
      expect(
        service.studentOnAssignmentRepository.update,
      ).not.toHaveBeenCalled();
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

  describe('soft-deleted assignment', () => {
    const deleted = () =>
      mockPrismaService.studentOnAssignment.findUnique.mockResolvedValueOnce({
        id: 'sa1',
        assignment: { isDeleted: true },
      });

    it('getById 404s for the student', async () => {
      deleted();
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', studentId: 'st1' });

      await expect(
        service.getById({ id: 'sa1' }, { id: 'st1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('update 404s and writes nothing', async () => {
      deleted();
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', assignmentId: 'a1', subjectId: 's1' });

      await expect(
        service.update(
          {
            query: { studentOnAssignmentId: 'sa1' },
            body: { score: 5 },
          } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(
        service.studentOnAssignmentRepository.update,
      ).not.toHaveBeenCalled();
    });

    it('delete 404s and deletes nothing', async () => {
      deleted();
      (
        service.studentOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', subjectId: 's1', schoolId: 'sch1' });

      await expect(
        service.delete({ studentOnAssignmentId: 'sa1' }, { id: 'u1' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(
        service.studentOnAssignmentRepository.delete,
      ).not.toHaveBeenCalled();
    });
  });
});
