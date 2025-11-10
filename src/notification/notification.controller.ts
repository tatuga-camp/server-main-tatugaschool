import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { Notification, User } from '@prisma/client';
import { MarkAsReadeNotificationDto } from './dto';

@Controller('v1/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @UseGuards(UserGuard)
  async getMyNotifications(@GetUser() user: User): Promise<Notification[]> {
    return await this.notificationService.getNotificationsForUser(user);
  }

  @Patch('mark-as-read')
  @UseGuards(UserGuard)
  async markAllAsRead(@GetUser() user: User) {
    return await this.notificationService.markAllNotificationsAsRead(user);
  }

  @Patch('mark-as-read/:id')
  @UseGuards(UserGuard)
  async markAsRead(
    @GetUser() user: User,
    @Param() dto: MarkAsReadeNotificationDto,
  ) {
    return await this.notificationService.markNotificationAsRead(dto.id, user);
  }
}
