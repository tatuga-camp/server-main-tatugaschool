import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';
import { SchoolModule } from '../school/school.module';
import { StudentService } from '../student/student.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { GradeService } from '../grade/grade.service';
import { GradeModule } from '../grade/grade.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => SchoolModule),
    forwardRef(() => MemberOnSchoolModule),
    forwardRef(() => GradeModule),
  ],
  providers: [
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    ClassService,
    StudentService,
    GradeService,
  ],
  controllers: [SubjectController],
})
export class SubjectModule {}
