import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GetStudent, GetUser } from '../auth/decorators';
import { StudentGuard, UserGuard } from '../auth/guard';
import { Notification, User } from '@prisma/client';
import { MarkAsReadeNotificationDto } from './dto';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('student')
  @UseGuards(StudentGuard)
  async getMyNotificationsStudent(
    @GetStudent() student: StudentJwtPayload,
  ): Promise<Notification[]> {
    return await this.notificationService.getNotificationsForStudent(student);
  }

  @Patch('student/mark-as-read')
  @UseGuards(StudentGuard)
  async markAllAsReadStudent(@GetStudent() student: StudentJwtPayload) {
    return await this.notificationService.markAllNotificationsAsReadStudent(
      student,
    );
  }

  @Patch('student/mark-as-read/:id')
  @UseGuards(StudentGuard)
  async markAsReadStudent(
    @GetStudent() student: StudentJwtPayload,
    @Param() dto: MarkAsReadeNotificationDto,
  ) {
    return await this.notificationService.markNotificationAsReadStudent(
      dto.id,
      student,
    );
  }

  @Get()
  @UseGuards(UserGuard)
  async getMyNotifications(
    @GetUser() user: UserJwtPayload,
  ): Promise<Notification[]> {
    return await this.notificationService.getNotificationsForUser(user);
  }

  @Patch('mark-as-read')
  @UseGuards(UserGuard)
  async markAllAsRead(@GetUser() user: UserJwtPayload) {
    return await this.notificationService.markAllNotificationsAsRead(user);
  }

  @Patch('mark-as-read/:id')
  @UseGuards(UserGuard)
  async markAsRead(
    @GetUser() user: UserJwtPayload,
    @Param() dto: MarkAsReadeNotificationDto,
  ) {
    return await this.notificationService.markNotificationAsRead(dto.id, user);
  }
}
