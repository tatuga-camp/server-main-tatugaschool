import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { Notification, NotificationType, Prisma, User } from '@prisma/client';
import { PushService } from '../web-push/push.service';
import { PushSubscription } from '../web-push/interfaces';

@Injectable()
export class NotificationService {
  private logger: Logger;
  constructor(
    // Inject using the interface type for better testability
    private readonly repository: NotificationRepository,
    private readonly pushService: PushService, // Inject your PushService
  ) {
    this.logger = new Logger(NotificationService.name);
  }

  async createNotifications(dto: {
    userIds: string[];
    actorName: string;
    actorId: string;
    actorImage: string;
    type: NotificationType;
    message: string;
    link: URL;
    schoolId: string;
    subjectId: string;
  }) {
    const { userIds } = dto;
    const methodName = 'createNotifications'; // For logging context

    try {
      const dataToCreate = userIds.map<Prisma.NotificationCreateManyInput>(
        (userId) => ({
          userId,
          link: dto.link.toString(),
          actorName: dto.actorName,
          actorId: dto.actorId,
          type: dto.type,
          message: dto.message,
          schoolId: dto.schoolId,
          subjectId: dto.subjectId,
          actorImage: dto.actorImage,
        }),
      );

      const createResult = await this.repository.createMany({
        data: dataToCreate,
      });

      const pushPayload = {
        title: this.getNotificationTitle(dto.type),
        body: dto.message,
        url: dto.link,
        groupId: dto.subjectId,
      };

      for (const userId of userIds) {
        const subscription = await this.pushService.pushRepository.findFirst({
          where: {
            userId: userId,
          },
          orderBy: { createAt: 'desc' },
        });
        this.pushService
          .sendNotification(subscription.data as PushSubscription, {
            title: pushPayload.title,
            body: pushPayload.body,
            url: pushPayload.url,
            groupId: pushPayload.groupId,
          })
          .catch((err) =>
            this.logger.error(
              `[${methodName}] Failed to send push to ${userId}:`,
              err.stack || err.message,
            ),
          );
      }

      return createResult;
    } catch (error) {
      this.logger.error(
        `[${methodName}] Failed to create notifications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private getNotificationTitle(type: NotificationType): string {
    switch (type) {
      case 'STUDENT_SUBMISSION':
        return 'New Submission';
      default:
        return 'New Notification';
    }
  }

  async getNotificationsForUser(user: User): Promise<Notification[]> {
    try {
      return await this.repository.findManyForUser({ userId: user.id });
    } catch (error) {
      this.logger.error(
        `[getNotificationsForUser] Failed to get notifications for user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getUnreadCount(user: User) {
    try {
      const count = await this.repository.getUnreadCount({ userId: user.id });
      return { count };
    } catch (error) {
      this.logger.error(
        `[getUnreadCount] Failed to get unread count for user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markNotificationAsRead(id: string, user: User): Promise<Notification> {
    try {
      const notification = await this.repository.findById({
        id,
      });
      if (!notification || notification.userId !== user.id) {
        throw new ForbiddenException('Cannot access this notification');
      }

      return await this.repository.markAsRead({ id });
    } catch (error) {
      this.logger.error(
        `[markNotificationAsRead] Failed to mark notification ${id} as read for user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async markAllNotificationsAsRead(user: User): Promise<{ count: number }> {
    try {
      return await this.repository.markAllAsRead({
        userId: user.id,
      });
    } catch (error) {
      this.logger.error(
        `[markAllNotificationsAsRead] Failed to mark all notifications as read for user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
