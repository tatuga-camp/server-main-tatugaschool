import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotificationService } from '../notification/notification.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { StorageService } from '../storage/storage.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('AnnouncementService', () => {
  let service: AnnouncementService;

  const mockPrismaService = {
    subject: { findUnique: jest.fn() },
    school: { findUnique: jest.fn(), update: jest.fn() },
    studentOnSubject: { findMany: jest.fn(), findFirst: jest.fn() },
    commentOnAnnouncement: { deleteMany: jest.fn() },
    reactionOnAnnouncement: { deleteMany: jest.fn() },
    fileOnAnnouncement: { findMany: jest.fn(), deleteMany: jest.fn() },
  };

  // note: school storage accounting goes through prisma directly (school.update),
  // so mockPrismaService.school has BOTH findUnique and update mocked below

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockNotificationService = {
    createStudentNotifications: jest.fn(),
  };

  const mockLineBotService = {
    sendMessage: jest.fn(),
  };

  const mockStorageService = {
    DeleteFileOnStorage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: LineBotService, useValue: mockLineBotService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<AnnouncementService>(AnnouncementService);

    service.announcementRepository = {
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

  const teacher = { id: 'u1', email: 't@t.com' } as any;
  const mockSubject = {
    id: 'subj1',
    code: 'ABC123',
    title: 'Math',
    schoolId: 'sch1',
    isLocked: false,
    isVerifyLine: true,
    lineGroupId: 'g1',
    allowSendNotificationOnAnnouncementToLine: true,
  };

  describe('create', () => {
    beforeEach(() => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      (service['userRepository'].findById as jest.Mock).mockResolvedValue({
        id: 'u1',
        firstName: 'Ada',
        lastName: 'L',
        photo: 'p.png',
        blurHash: null,
      });
      (service.announcementRepository.create as jest.Mock).mockResolvedValue({
        id: 'ann1',
        title: 'SGS closing',
        content: '<p>hurry</p>',
        subjectId: 'subj1',
        schoolId: 'sch1',
      });
      mockPrismaService.studentOnSubject.findMany.mockResolvedValue([
        { studentId: 'st1' },
        { studentId: 'st2' },
      ]);
      mockPrismaService.school.findUnique.mockResolvedValue({
        id: 'sch1',
        plan: 'PREMIUM',
      });
      mockNotificationService.createStudentNotifications.mockResolvedValue({
        count: 2,
      });
      mockLineBotService.sendMessage.mockResolvedValue(undefined);
    });

    it('creates the announcement with denormalized author', async () => {
      const result = await service.create(
        { title: 'SGS closing', content: '<p>hurry</p>', subjectId: 'subj1' },
        teacher,
      );
      expect(result.id).toBe('ann1');
      expect(service.announcementRepository.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'SGS closing',
          firstName: 'Ada',
          lastName: 'L',
          userId: 'u1',
          subjectId: 'subj1',
          schoolId: 'sch1',
        }),
      });
    });

    it('fans out bell notifications to active students and LINE to the group', async () => {
      await service.create(
        { title: 'SGS closing', content: '<p>hurry</p>', subjectId: 'subj1' },
        teacher,
      );
      // fan-out is fire-and-forget; flush microtasks
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(
        mockNotificationService.createStudentNotifications,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          studentIds: ['st1', 'st2'],
          type: 'NEW_ANNOUNCEMENT',
          subjectId: 'subj1',
        }),
      );
      expect(mockLineBotService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'g1' }),
      );
    });

    it('still fires LINE when the bell/push recipient fetch fails', async () => {
      mockPrismaService.studentOnSubject.findMany.mockRejectedValue(
        new Error('transient db error'),
      );
      await service.create(
        { title: 'x', content: 'y', subjectId: 'subj1' },
        teacher,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLineBotService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'g1' }),
      );
    });

    it('still fires LINE when createStudentNotifications rejects', async () => {
      mockNotificationService.createStudentNotifications.mockRejectedValue(
        new Error('notification service down'),
      );
      await service.create(
        { title: 'x', content: 'y', subjectId: 'subj1' },
        teacher,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLineBotService.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 'g1' }),
      );
    });

    it('skips LINE when the school plan is FREE', async () => {
      mockPrismaService.school.findUnique.mockResolvedValue({
        id: 'sch1',
        plan: 'FREE',
      });
      await service.create(
        { title: 'x', content: 'y', subjectId: 'subj1' },
        teacher,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
      expect(
        mockNotificationService.createStudentNotifications,
      ).toHaveBeenCalled();
    });

    it('skips LINE when the toggle is off', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        ...mockSubject,
        allowSendNotificationOnAnnouncementToLine: false,
      });
      await service.create(
        { title: 'x', content: 'y', subjectId: 'subj1' },
        teacher,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockLineBotService.sendMessage).not.toHaveBeenCalled();
    });

    it('rejects a locked subject', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        ...mockSubject,
        isLocked: true,
      });
      await expect(
        service.create({ title: 'x', content: 'y', subjectId: 'subj1' }, teacher),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getBySubjectFromStudent', () => {
    it('rejects a student not enrolled in the subject', async () => {
      mockPrismaService.studentOnSubject.findFirst.mockResolvedValue(null);
      await expect(
        service.getBySubjectFromStudent({ subjectId: 'subj1' }, {
          id: 'st9',
          schoolId: 'sch1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns the feed for an enrolled student', async () => {
      mockPrismaService.studentOnSubject.findFirst.mockResolvedValue({
        id: 'sos1',
        studentId: 'st1',
        isActive: true,
      });
      (service.announcementRepository.findMany as jest.Mock).mockResolvedValue([
        { id: 'ann1' },
      ]);
      const result = await service.getBySubjectFromStudent(
        { subjectId: 'subj1' },
        { id: 'st1', schoolId: 'sch1' } as any,
      );
      expect(result[0].id).toBe('ann1');
    });
  });

  describe('delete', () => {
    it('cascades comments, reactions, files and refunds storage', async () => {
      (service.announcementRepository.findById as jest.Mock).mockResolvedValue({
        id: 'ann1',
        subjectId: 'subj1',
        schoolId: 'sch1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockPrismaService.fileOnAnnouncement.findMany.mockResolvedValue([
        { id: 'f1', url: 'https://r2/x', size: 100, type: 'image/png' },
      ]);
      mockStorageService.DeleteFileOnStorage.mockResolvedValue(undefined);
      (service.announcementRepository.delete as jest.Mock).mockResolvedValue({
        id: 'ann1',
      });

      await service.delete({ announcementId: 'ann1' }, teacher);

      expect(
        mockPrismaService.commentOnAnnouncement.deleteMany,
      ).toHaveBeenCalledWith({ where: { announcementId: 'ann1' } });
      expect(
        mockPrismaService.reactionOnAnnouncement.deleteMany,
      ).toHaveBeenCalledWith({ where: { announcementId: 'ann1' } });
      expect(mockStorageService.DeleteFileOnStorage).toHaveBeenCalledWith({
        fileName: 'https://r2/x',
      });
      expect(
        mockPrismaService.fileOnAnnouncement.deleteMany,
      ).toHaveBeenCalledWith({ where: { announcementId: 'ann1' } });
      expect(mockPrismaService.school.update).toHaveBeenCalledWith({
        where: { id: 'sch1' },
        data: { totalStorage: { decrement: 100 } },
      });
      expect(service.announcementRepository.delete).toHaveBeenCalledWith({
        announcementId: 'ann1',
      });
    });

    it('throws NotFound for a missing announcement', async () => {
      (service.announcementRepository.findById as jest.Mock).mockResolvedValue(
        null,
      );
      await expect(
        service.delete({ announcementId: 'nope' }, teacher),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
