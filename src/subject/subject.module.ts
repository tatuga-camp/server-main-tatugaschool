import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';

@Module({
  imports: [HttpModule],
  providers: [
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    ClassService,
    MemberOnSchoolService,
    SchoolService,
  ],
  controllers: [SubjectController],
})
export class SubjectModule {}
