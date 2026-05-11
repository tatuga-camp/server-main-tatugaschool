import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { PushService } from '../web-push/push.service';
import { ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('NotificationService', () => {
  let service: NotificationService;

  const mockNotificationRepo = {
    createMany: jest.fn(),
    findManyForUser: jest.fn(),
    getUnreadCount: jest.fn(),
    findById: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockPushService = {
    pushRepository: {
      findFirst: jest.fn(),
    },
    sendNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: NotificationRepository, useValue: mockNotificationRepo },
        { provide: PushService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotifications', () => {
    it('should create notifications and send push', async () => {
      const dto: any = {
        userIds: ['u1'],
        actorName: 'A',
        actorId: 'a1',
        actorImage: 'img',
        type: 'STUDENT_SUBMISSION',
        message: 'Hello',
        link: new URL('http://localhost'),
        schoolId: 'sch1',
        subjectId: 's1',
      };

      mockNotificationRepo.createMany.mockResolvedValue({ count: 1 });
      mockPushService.pushRepository.findFirst.mockResolvedValue({ data: {} });
      mockPushService.sendNotification.mockResolvedValue({});

      const result = await service.createNotifications(dto);

      expect(mockNotificationRepo.createMany).toHaveBeenCalled();
      expect(mockPushService.sendNotification).toHaveBeenCalled();
      expect(result).toEqual({ count: 1 });
    });

    it('should return count 0 if no userIds', async () => {
      const result = await service.createNotifications({ userIds: [] } as any);
      expect(result).toEqual({ count: 0 });
    });
  });

  describe('getNotificationsForUser', () => {
    it('should return notifications', async () => {
      mockNotificationRepo.findManyForUser.mockResolvedValue([{ id: 'n1' }]);

      const result = await service.getNotificationsForUser({ id: 'u1' } as any);
      expect(result).toEqual([{ id: 'n1' }]);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockNotificationRepo.getUnreadCount.mockResolvedValue(5);

      const result = await service.getUnreadCount({ id: 'u1' } as any);
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark as read', async () => {
      mockNotificationRepo.findById.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
      });
      mockNotificationRepo.markAsRead.mockResolvedValue({
        id: 'n1',
        isRead: true,
      });

      const result = await service.markNotificationAsRead('n1', {
        id: 'u1',
      } as any);
      expect(result.isRead).toBe(true);
    });

    it('should throw ForbiddenException if user mismatch', async () => {
      mockNotificationRepo.findById.mockResolvedValue({
        id: 'n1',
        userId: 'u2',
      });

      await expect(
        service.markNotificationAsRead('n1', { id: 'u1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all as read', async () => {
      mockNotificationRepo.markAllAsRead.mockResolvedValue({ count: 5 });

      const result = await service.markAllNotificationsAsRead({
        id: 'u1',
      } as any);
      expect(result).toEqual({ count: 5 });
    });
  });
});
