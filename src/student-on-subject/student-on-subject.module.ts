import { Module } from '@nestjs/common';
import { StudentOnSubjectService } from './student-on-subject.service';
import { StudentOnSubjectController } from './student-on-subject.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';
import { SchoolService } from '../school/school.service';
import { GradeService } from '../grade/grade.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [HttpModule],
  providers: [
    StudentOnSubjectService,
    TeacherOnSubjectService,
    WheelOfNameService,
    SchoolService,
    GradeService,
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SubjectService,
    StudentService,
    ClassService,
    AttendanceTableService,
    UsersService,
  ],
  controllers: [StudentOnSubjectController],
})
export class StudentOnSubjectModule {}
