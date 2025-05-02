import { Module } from '@nestjs/common';
import { GroupOnSubjectService } from './group-on-subject.service';
import { GroupOnSubjectController } from './group-on-subject.controller';
import { SubjectService } from '../subject/subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { GradeService } from '../grade/grade.service';
import { HttpModule } from '@nestjs/axios';
import { StudentService } from '../student/student.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';

@Module({
  imports: [HttpModule],
  providers: [
    GroupOnSubjectService,
    SubjectService,
    TeacherOnSubjectService,
    WheelOfNameService,
    AttendanceTableService,
    ClassService,
    MemberOnSchoolService,
    SchoolService,
    GradeService,
    StudentService,
    StudentOnSubjectService,
  ],
  controllers: [GroupOnSubjectController],
})
export class GroupOnSubjectModule {}
