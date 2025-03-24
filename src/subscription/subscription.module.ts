import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SchoolService } from '../school/school.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { StudentService } from '../student/student.service';
import { ClassService } from '../class/class.service';
import { SubjectService } from '../subject/subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { HttpModule } from '@nestjs/axios';
import { GradeService } from '../grade/grade.service';

@Module({
  imports: [HttpModule],
  providers: [
    SubscriptionService,
    SchoolService,
    MemberOnSchoolService,
    StudentService,
    ClassService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    GradeService,
  ],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}
