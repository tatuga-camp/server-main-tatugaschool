import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { StudentOnSubjectService } from 'src/student-on-subject/student-on-subject.service';
import { AttendanceTableService } from 'src/attendance-table/attendance-table.service';
import { AttendanceRowService } from 'src/attendance-row/attendance-row.service';
import { WheelOfNameService } from 'src/wheel-of-name/wheel-of-name.service';
import { TeacherOnSubjectService } from 'src/teacher-on-subject/teacher-on-subject.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [
    AttendanceService,
    StudentOnSubjectService,
    AttendanceTableService,
    AttendanceRowService,

    TeacherOnSubjectService,
    WheelOfNameService,
  ],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
