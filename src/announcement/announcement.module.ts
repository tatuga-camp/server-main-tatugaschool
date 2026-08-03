import { Module } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';

@Module({
  providers: [
    AnnouncementService,
    TeacherOnSubjectService,
    NotificationService,
    NotificationRepository,
  ],
  controllers: [AnnouncementController],
})
export class AnnouncementModule {}
