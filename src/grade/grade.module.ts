import { forwardRef, Module } from '@nestjs/common';
import { GradeService } from './grade.service';
import { GradeController } from './grade.controller';
import { SubjectService } from '../subject/subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { HttpModule } from '@nestjs/axios';
import { StudentService } from '../student/student.service';
import { SubjectModule } from '../subject/subject.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [HttpModule, forwardRef(() => SubjectModule)],
  providers: [
    GradeService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    ClassService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    SubjectService,
    UsersService,
  ],
  controllers: [GradeController],
})
export class GradeModule {}
