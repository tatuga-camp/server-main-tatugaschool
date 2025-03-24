import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { StudentOnSubjectService } from 'src/student-on-subject/student-on-subject.service';
import { AttendanceTableService } from 'src/attendance-table/attendance-table.service';
import { AttendanceRowService } from 'src/attendance-row/attendance-row.service';
import { WheelOfNameService } from 'src/wheel-of-name/wheel-of-name.service';
import { TeacherOnSubjectService } from 'src/teacher-on-subject/teacher-on-subject.service';
import { HttpModule } from '@nestjs/axios';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { StudentService } from '../student/student.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { GradeService } from '../grade/grade.service';

@Module({
  imports: [HttpModule],
  providers: [
    AttendanceService,
    StudentOnSubjectService,
    AttendanceStatusListService,
    AttendanceTableService,
    AttendanceRowService,
    SubjectService,
    ClassService,
    TeacherOnSubjectService,
    WheelOfNameService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    GradeService,
  ],
  controllers: [AttendanceController],
})
export class AttendanceModule {}
