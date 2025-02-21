import { forwardRef, Module } from '@nestjs/common';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';
import { StudentModule } from '../student/student.module';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { SubjectService } from '../subject/subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { ClassService } from '../class/class.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    forwardRef(() => MemberOnSchoolModule),
    forwardRef(() => StudentModule),
    HttpModule,
  ],
  providers: [
    SchoolService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    ClassService,
  ],
  controllers: [SchoolController],
  exports: [SchoolService],
})
export class SchoolModule {}
