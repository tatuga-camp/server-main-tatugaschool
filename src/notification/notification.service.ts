import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { NotificationRepository } from './notification.repository';
import { Notification, NotificationType, Prisma, User } from '@prisma/client';
import { PushService } from '../web-push/push.service';
import { PushSubscription } from '../web-push/interfaces';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

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

    if (!userIds || userIds.length === 0) {
      return { count: 0 };
    }

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
        if (!subscription) continue;
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
      throw error;
    }
  }

  private getNotificationTitle(type: NotificationType): string {
    switch (type) {
      case 'STUDENT_SUBMISSION':
        return 'New Submission';
      case 'NEW_ANNOUNCEMENT':
        return 'New Announcement';
      default:
        return 'New Notification';
    }
  }

  async getNotificationsForUser(user: UserJwtPayload): Promise<Notification[]> {
    try {
      return await this.repository.findManyForUser({ userId: user.id });
    } catch (error) {
      throw error;
    }
  }

  async getUnreadCount(user: UserJwtPayload) {
    try {
      const count = await this.repository.getUnreadCount({ userId: user.id });
      return { count };
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsRead(
    id: string,
    user: UserJwtPayload,
  ): Promise<Notification> {
    try {
      const notification = await this.repository.findById({
        id,
      });
      if (!notification || notification.userId !== user.id) {
        throw new ForbiddenException('Cannot access this notification');
      }

      return await this.repository.markAsRead({ id });
    } catch (error) {
      throw error;
    }
  }

  async markAllNotificationsAsRead(
    user: UserJwtPayload,
  ): Promise<{ count: number }> {
    try {
      return await this.repository.markAllAsRead({
        userId: user.id,
      });
    } catch (error) {
      throw error;
    }
  }

  async createStudentNotifications(dto: {
    studentIds: string[];
    actorName: string;
    actorId: string;
    actorImage: string;
    type: NotificationType;
    message: string;
    link: URL;
    schoolId: string;
    subjectId: string;
  }) {
    const { studentIds } = dto;
    const methodName = 'createStudentNotifications';

    if (!studentIds || studentIds.length === 0) {
      return { count: 0 };
    }

    try {
      const dataToCreate = studentIds.map<Prisma.NotificationCreateManyInput>(
        (studentId) => ({
          studentId,
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

      const subscriptions = await this.pushService.pushRepository.findMany({
        where: {
          studentId: { in: studentIds },
        },
      });

      for (const subscription of subscriptions) {
        this.pushService
          .sendNotification(subscription.data as PushSubscription, {
            title: this.getNotificationTitle(dto.type),
            body: dto.message,
            url: dto.link,
            groupId: dto.subjectId,
          })
          .catch((err) =>
            this.logger.error(
              `[${methodName}] Failed to push to student ${subscription.studentId}:`,
              err.stack || err.message,
            ),
          );
      }

      return createResult;
    } catch (error) {
      throw error;
    }
  }

  async getNotificationsForStudent(
    student: StudentJwtPayload,
  ): Promise<Notification[]> {
    try {
      return await this.repository.findManyForStudent({
        studentId: student.id,
      });
    } catch (error) {
      throw error;
    }
  }

  async markNotificationAsReadStudent(
    id: string,
    student: StudentJwtPayload,
  ): Promise<Notification> {
    try {
      const notification = await this.repository.findById({ id });
      if (!notification || notification.studentId !== student.id) {
        throw new ForbiddenException('Cannot access this notification');
      }
      return await this.repository.markAsRead({ id });
    } catch (error) {
      throw error;
    }
  }

  async markAllNotificationsAsReadStudent(
    student: StudentJwtPayload,
  ): Promise<{ count: number }> {
    try {
      return await this.repository.markAllAsReadForStudent({
        studentId: student.id,
      });
    } catch (error) {
      throw error;
    }
  }
}
