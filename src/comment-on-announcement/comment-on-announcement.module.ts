import { Module } from '@nestjs/common';
import { CommentOnAnnouncementService } from './comment-on-announcement.service';
import { CommentOnAnnouncementController } from './comment-on-announcement.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [CommentOnAnnouncementService, TeacherOnSubjectService],
  controllers: [CommentOnAnnouncementController],
})
export class CommentOnAnnouncementModule {}
