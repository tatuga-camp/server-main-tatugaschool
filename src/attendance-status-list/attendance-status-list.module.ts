import { Module } from '@nestjs/common';
import { AttendanceStatusListService } from './attendance-status-list.service';
import { AttendanceStatusListController } from './attendance-status-list.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [AttendanceStatusListService, TeacherOnSubjectService],
  controllers: [AttendanceStatusListController],
})
export class AttendanceStatusListModule {}
