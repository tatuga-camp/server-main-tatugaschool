import { Module } from '@nestjs/common';
import { FileOnAnnouncementService } from './file-on-announcement.service';
import { FileOnAnnouncementController } from './file-on-announcement.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [FileOnAnnouncementService, TeacherOnSubjectService],
  controllers: [FileOnAnnouncementController],
})
export class FileOnAnnouncementModule {}
