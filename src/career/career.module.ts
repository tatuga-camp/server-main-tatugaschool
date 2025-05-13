import { Module } from '@nestjs/common';
import { CareerService } from './career.service';
import { CareerController } from './career.controller';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { GradeService } from '../grade/grade.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [HttpModule],
  providers: [
    CareerService,
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    SubjectService,
    ClassService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    SkillService,
    GradeService,
    UsersService,
  ],
  controllers: [CareerController],
})
export class CareerModule {}
