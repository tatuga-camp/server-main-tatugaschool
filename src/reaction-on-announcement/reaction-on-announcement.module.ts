import { Module } from '@nestjs/common';
import { ReactionOnAnnouncementService } from './reaction-on-announcement.service';
import { ReactionOnAnnouncementController } from './reaction-on-announcement.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [ReactionOnAnnouncementService, TeacherOnSubjectService],
  controllers: [ReactionOnAnnouncementController],
})
export class ReactionOnAnnouncementModule {}
