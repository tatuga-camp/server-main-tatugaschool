import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentOnAnnouncementService } from './comment-on-announcement.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('CommentOnAnnouncementService', () => {
  let service: CommentOnAnnouncementService;

  const mockPrismaService = {
    announcement: { findUnique: jest.fn() },
    subject: { findUnique: jest.fn() },
    studentOnSubject: { findFirst: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
    teacherOnSubjectRepository: {
      getByTeacherIdAndSubjectId: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentOnAnnouncementService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
      ],
    }).compile();

    service = module.get<CommentOnAnnouncementService>(
      CommentOnAnnouncementService,
    );

    service.commentOnAnnouncementRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    service['userRepository'] = {
      findById: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const announcement = { id: 'ann1', subjectId: 'subj1', schoolId: 'sch1' };
  const student = { id: 'st1', schoolId: 'sch1' } as any;
  const teacher = { id: 'u1', email: 't@t.com' } as any;

  describe('createFromStudent', () => {
    it('creates a comment with denormalized student identity from StudentOnSubject', async () => {
      mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
      mockPrismaService.studentOnSubject.findFirst.mockResolvedValue({
        id: 'sos1',
        studentId: 'st1',
        title: 'Mr.',
        firstName: 'Somchai',
        lastName: 'S',
        photo: 'p.png',
        blurHash: null,
        number: '12',
        isActive: true,
      });
      (
        service.commentOnAnnouncementRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'c1' });

      const result = await service.createFromStudent(
        { announcementId: 'ann1', content: 'ครับ' },
        student,
      );

      expect(result.id).toBe('c1');
      expect(
        service.commentOnAnnouncementRepository.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: 'ครับ',
          announcementId: 'ann1',
          studentId: 'st1',
          firstName: 'Somchai',
          subjectId: 'subj1',
          schoolId: 'sch1',
        }),
      });
    });

    it('rejects a student not enrolled in the subject', async () => {
      mockPrismaService.announcement.findUnique.mockResolvedValue(announcement);
      mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(null);
      await expect(
        service.createFromStudent(
          { announcementId: 'ann1', content: 'x' },
          student,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteFromStudent', () => {
    it('rejects deleting another student\'s comment', async () => {
      (
        service.commentOnAnnouncementRepository.findById as jest.Mock
      ).mockResolvedValue({ id: 'c1', studentId: 'someone-else' });
      await expect(
        service.deleteFromStudent({ commentOnAnnouncementId: 'c1' }, student),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateFromTeacher', () => {
    it('validates the caller still has teacher access to the subject', async () => {
      (
        service.commentOnAnnouncementRepository.findById as jest.Mock
      ).mockResolvedValue({ id: 'c1', userId: 'u1', subjectId: 'subj1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.commentOnAnnouncementRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'c1', content: 'edited' });

      const result = await service.updateFromTeacher(
        { query: { commentOnAnnouncementId: 'c1' }, body: { content: 'edited' } },
        teacher,
      );

      expect(result.id).toBe('c1');
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 'subj1',
      });
    });

    it('rejects when ValidateAccess throws (caller no longer has subject access)', async () => {
      (
        service.commentOnAnnouncementRepository.findById as jest.Mock
      ).mockResolvedValue({ id: 'c1', userId: 'u1', subjectId: 'subj1' });
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException("You don't have permission to access"),
      );

      await expect(
        service.updateFromTeacher(
          {
            query: { commentOnAnnouncementId: 'c1' },
            body: { content: 'edited' },
          },
          teacher,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects editing another teacher\'s comment', async () => {
      (
        service.commentOnAnnouncementRepository.findById as jest.Mock
      ).mockResolvedValue({ id: 'c1', userId: 'someone-else', subjectId: 'subj1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      await expect(
        service.updateFromTeacher(
          {
            query: { commentOnAnnouncementId: 'c1' },
            body: { content: 'edited' },
          },
          teacher,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteFromTeacher', () => {
    it('allows a subject teacher to delete any comment (moderation)', async () => {
      (
        service.commentOnAnnouncementRepository.findById as jest.Mock
      ).mockResolvedValue({ id: 'c1', studentId: 'st1', subjectId: 'subj1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.commentOnAnnouncementRepository.delete as jest.Mock
      ).mockResolvedValue({ id: 'c1' });

      const result = await service.deleteFromTeacher(
        { commentOnAnnouncementId: 'c1' },
        teacher,
      );
      expect(result.id).toBe('c1');
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 'subj1',
      });
    });
  });
});
