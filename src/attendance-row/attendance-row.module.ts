import { Module } from '@nestjs/common';
import { AttendanceRowService } from './attendance-row.service';
import { AttendanceRowController } from './attendance-row.controller';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],

  providers: [
    AttendanceRowService,
    StudentOnSubjectService,
    TeacherOnSubjectService,
    WheelOfNameService,
  ],
  controllers: [AttendanceRowController],
})
export class AttendanceRowModule {}
