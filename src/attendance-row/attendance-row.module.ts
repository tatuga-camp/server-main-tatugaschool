import { Module } from '@nestjs/common';
import { AttendanceRowService } from './attendance-row.service';
import { AttendanceRowController } from './attendance-row.controller';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';
import { SubjectService } from '../subject/subject.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { StudentService } from '../student/student.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';

@Module({
  imports: [HttpModule],
  providers: [
    AttendanceRowService,
    StudentOnSubjectService,
    TeacherOnSubjectService,
    WheelOfNameService,
    AttendanceStatusListService,
    SubjectService,
    AttendanceTableService,
    ClassService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
  ],
  controllers: [AttendanceRowController],
})
export class AttendanceRowModule {}
