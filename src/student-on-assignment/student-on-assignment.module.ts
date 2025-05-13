import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { StudentOnAssignmentController } from './student-on-assignment.controller';
import { StudentOnAssignmentService } from './student-on-assignment.service';
import { GradeService } from '../grade/grade.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [HttpModule],
  providers: [
    StudentOnAssignmentService,
    TeacherOnSubjectService,
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    ClassService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    GradeService,
    UsersService,
  ],
  controllers: [StudentOnAssignmentController],
})
export class StudentOnAssignmentModule {}
