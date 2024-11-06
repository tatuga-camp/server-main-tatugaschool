import { Module } from '@nestjs/common';
import { AttendanceTableService } from './attendance-table.service';
import { AttendanceTableController } from './attendance-table.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [AttendanceTableService, TeacherOnSubjectService],
  controllers: [AttendanceTableController],
})
export class AttendanceTableModule {}
