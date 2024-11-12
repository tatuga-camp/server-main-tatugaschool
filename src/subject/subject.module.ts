import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  imports: [HttpModule],
  providers: [
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
  ],
  controllers: [SubjectController],
})
export class SubjectModule {}
