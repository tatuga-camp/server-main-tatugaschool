import { Test, TestingModule } from '@nestjs/testing';
import { CommentAssignmentService } from './comment-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';
import {
  createPassthroughCache,
  createTestCache,
} from '../cache/testing/cache-test-utils';
import { subjectScope } from '../cache/cache-scopes';
import { TTL } from '../cache/cache-ttl';

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
    studentOnAssignment: { findUnique: jest.fn() },
    commentOnAssignment: { findMany: jest.fn() },
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
        { provide: CacheService, useValue: createPassthroughCache() },
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

    service['studentOnAssignmentRepository'] = {
      getById: jest.fn(),
    } as any;

    service['userRepository'] = {
      findById: jest.fn(),
    } as any;

    mockPrismaService.studentOnAssignment.findUnique.mockResolvedValue({
      id: 'sa1',
      assignment: { isDeleted: false },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByStudentOnAssignment', () => {
    const dto = { studentOnAssignmentId: 'sa1' };
    const user = { id: 'u1' } as any;
    const ref = { subjectId: 's1', studentId: 'st1' };
    let refs: { submission: jest.Mock };
    let getOrSet: jest.Mock;

    beforeEach(() => {
      refs = { submission: jest.fn().mockResolvedValue(ref) };
      (service as any).refs = refs;
      getOrSet = (service as any).cache.getOrSet;
      mockPrismaService.studentOnAssignment.findUnique.mockResolvedValue({
        id: 'sa1',
      });
      mockPrismaService.commentOnAssignment.findMany.mockResolvedValue([
        { id: 'c1' },
      ]);
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
    });

    afterEach(() => {
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
      mockPrismaService.studentOnAssignment.findUnique.mockReset();
      mockPrismaService.commentOnAssignment.findMany.mockReset();
    });

    it('should return comments from the submission comments cache unit', async () => {
      const result = await service.getByStudentOnAssignment(dto, user, null);

      expect(result).toEqual([{ id: 'c1' }]);
      expect(refs.submission).toHaveBeenCalledWith('sa1');
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        subjectId: 's1',
        userId: 'u1',
      });
      expect(getOrSet).toHaveBeenCalledWith(
        'submissionComments:sa1',
        [subjectScope('s1', 'submissions')],
        TTL.SHORT,
        expect.any(Function),
      );
      expect(
        mockPrismaService.commentOnAssignment.findMany,
      ).toHaveBeenCalledWith({ where: { studentOnAssignmentId: 'sa1' } });
    });

    it('should authorize on every request, before reading the cache', async () => {
      await service.getByStudentOnAssignment(dto, user, null);
      await service.getByStudentOnAssignment(dto, user, null);

      const access = mockTeacherOnSubjectService.ValidateAccess.mock;
      expect(access.calls).toHaveLength(2);
      expect(getOrSet.mock.calls).toHaveLength(2);
      for (const i of [0, 1]) {
        expect(access.invocationCallOrder[i]).toBeLessThan(
          getOrSet.mock.invocationCallOrder[i],
        );
      }
    });

    it('should throw ForbiddenException if student ids mismatch', async () => {
      await expect(
        service.getByStudentOnAssignment(dto, null, { id: 'st2' } as any),
      ).rejects.toThrow(
        new ForbiddenException("You don't have permission to access"),
      );
      expect(getOrSet).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for an unknown submission', async () => {
      refs.submission.mockResolvedValue(null);

      await expect(
        service.getByStudentOnAssignment(dto, user, null),
      ).rejects.toThrow(
        new NotFoundException('studentOnAssignment is not found'),
      );
      expect(mockTeacherOnSubjectService.ValidateAccess).not.toHaveBeenCalled();
      expect(getOrSet).not.toHaveBeenCalled();
    });

    it('should 404 without reading comments when the assignment was soft-deleted', async () => {
      mockPrismaService.studentOnAssignment.findUnique.mockResolvedValue({
        id: 'sa1',
        assignment: { isDeleted: true },
      });

      await expect(
        service.getByStudentOnAssignment(dto, user, null),
      ).rejects.toThrow(NotFoundException);
      expect(
        mockPrismaService.commentOnAssignment.findMany,
      ).not.toHaveBeenCalled();
    });

    it('should not read comments when the access check rejects', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException("You're not a teacher on this subject"),
      );

      await expect(
        service.getByStudentOnAssignment(dto, user, null),
      ).rejects.toThrow(ForbiddenException);
      expect(getOrSet).not.toHaveBeenCalled();
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
        service['studentOnAssignmentRepository'].getById as jest.Mock
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
        service['studentOnAssignmentRepository'].getById as jest.Mock
      ).mockResolvedValue(mockStudentOnAssignment);

      service['userRepository'].findById = jest
        .fn()
        .mockResolvedValue(mockUser);
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
      const mockUser = {
        id: 'u1',
        firstName: 'Jane',
        lastName: 'Doe',
        photo: 'pic.jpg',
        email: 'test@example.com',
      };
      service['userRepository'].findById = jest
        .fn()
        .mockResolvedValue(mockUser);
      (
        service['studentOnAssignmentRepository'].getById as jest.Mock
      ).mockResolvedValue({ subjectId: 's1' });
      mockTeacherOnSubjectService.teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        null,
      );

      await expect(
        service.createFromTeacher({} as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('soft-deleted assignment', () => {
    beforeEach(() => {
      mockPrismaService.studentOnAssignment.findUnique.mockResolvedValue({
        id: 'sa1',
        assignment: { isDeleted: true },
      });
      (
        service['studentOnAssignmentRepository'].getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', subjectId: 's1', assignmentId: 'a1' });
    });

    it('createFromStudent 404s and writes nothing', async () => {
      await expect(
        service.createFromStudent(
          { studentOnAssignmentId: 'sa1' } as any,
          { id: 'st1', schoolId: 'sch1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(service.commentAssignmentRepository.create).not.toHaveBeenCalled();
    });

    it('createFromTeacher 404s and writes nothing', async () => {
      service['userRepository'].findById = jest
        .fn()
        .mockResolvedValue({ id: 'u1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      await expect(
        service.createFromTeacher(
          { studentOnAssignmentId: 'sa1' } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(service.commentAssignmentRepository.create).not.toHaveBeenCalled();
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

const LIVE_SELECT = { id: true, assignment: { select: { isDeleted: true } } };

describe('CommentAssignmentService.getByStudentOnAssignment (cached)', () => {
  const dto = { studentOnAssignmentId: 'sa1' };
  const teacher = { id: 'u1' } as any;
  const owner = { id: 'st1' } as any;
  const createAt = new Date('2026-10-01T08:00:00.000Z');
  let service: CommentAssignmentService;
  let cache: CacheService;
  let validateAccess: jest.Mock;
  // What the primary Prisma client holds: the submission and its comments.
  let submission: { subjectId: string; studentId: string } | null;
  let comments: Record<string, unknown>[];
  let prisma: Record<string, Record<string, jest.Mock>>;

  beforeEach(async () => {
    submission = { subjectId: 's1', studentId: 'st1' };
    comments = [{ id: 'c1', studentOnAssignmentId: 'sa1', createAt }];
    prisma = {
      studentOnAssignment: {
        // The ref selects subjectId and studentId; the existence check selects id.
        findUnique: jest.fn(
          async (args) =>
            submission &&
            (args.select?.id ? { id: args.where.id } : submission),
        ),
      },
      commentOnAssignment: { findMany: jest.fn(async () => comments) },
    };
    validateAccess = jest.fn().mockResolvedValue(true);
    cache = createTestCache().cache;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentAssignmentService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TeacherOnSubjectService,
          useValue: { ValidateAccess: validateAccess },
        },
        { provide: NotificationService, useValue: {} },
        { provide: CacheService, useValue: cache },
      ],
    }).compile();
    service = module.get<CommentAssignmentService>(CommentAssignmentService);
  });

  it('reads the comments from Prisma once across two calls', async () => {
    const first = await service.getByStudentOnAssignment(dto, teacher, null);
    const second = await service.getByStudentOnAssignment(dto, teacher, null);

    expect(first).toEqual(comments);
    // Served from Redis with its dates revived, so the response is unchanged.
    expect(second).toEqual(comments);
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledWith({
      where: { studentOnAssignmentId: 'sa1' },
    });
  });

  it('reloads the comments after a submissions bump', async () => {
    await service.getByStudentOnAssignment(dto, teacher, null);
    comments = [...comments, { id: 'c2', studentOnAssignmentId: 'sa1' }];
    // Every CommentOnAssignment write bumps its subject's submissions scope.
    await cache.bump(subjectScope('s1', 'submissions'));

    const result = await service.getByStudentOnAssignment(dto, teacher, null);

    expect(result.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(2);
  });

  it('refuses a student who does not own the submission, even with the comments cached', async () => {
    await service.getByStudentOnAssignment(dto, null, owner);

    await expect(
      service.getByStudentOnAssignment(dto, null, { id: 'st2' } as any),
    ).rejects.toThrow(
      new ForbiddenException("You don't have permission to access"),
    );
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for a deleted submission whose ref is still cached', async () => {
    await service.getByStudentOnAssignment(dto, teacher, null);
    submission = null;
    comments = [];
    // StudentOnAssignmentRepository.delete bumps the subject's submissions scope.
    await cache.bump(subjectScope('s1', 'submissions'));

    await expect(
      service.getByStudentOnAssignment(dto, teacher, null),
    ).rejects.toThrow(
      new NotFoundException('studentOnAssignment is not found'),
    );
    // The ref came from the cache; the loader's existence check found nothing.
    expect(prisma.studentOnAssignment.findUnique.mock.calls).toEqual([
      [{ where: { id: 'sa1' }, select: { subjectId: true, studentId: true } }],
      [{ where: { id: 'sa1' }, select: LIVE_SELECT }],
      [{ where: { id: 'sa1' }, select: LIVE_SELECT }],
    ]);
  });

  it('caches an empty list for a submission without comments, not a 404', async () => {
    comments = [];

    await expect(
      service.getByStudentOnAssignment(dto, null, owner),
    ).resolves.toEqual([]);
    await expect(
      service.getByStudentOnAssignment(dto, null, owner),
    ).resolves.toEqual([]);
    expect(prisma.commentOnAssignment.findMany).toHaveBeenCalledTimes(1);
    // The owner reads without a teacher access check.
    expect(validateAccess).not.toHaveBeenCalled();
  });
});
