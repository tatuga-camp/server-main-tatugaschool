import { Module } from '@nestjs/common';
import { CommentAssignmentService } from './comment-assignment.service';
import { CommentAssignmentController } from './comment-assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationRepository } from '../notification/notification.repository';

@Module({
  providers: [
    CommentAssignmentService,
    TeacherOnSubjectService,
    NotificationService,
    NotificationRepository,
  ],
  controllers: [CommentAssignmentController],
})
export class CommentAssignmentModule {}
