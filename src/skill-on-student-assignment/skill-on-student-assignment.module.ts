import { Module } from '@nestjs/common';
import { SkillOnStudentAssignmentController } from './skill-on-student-assignment.controller';
import { SkillOnStudentAssignmentService } from './skill-on-student-assignment.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { StudentService } from '../student/student.service';
import { ClassService } from '../class/class.service';
import { SubjectService } from '../subject/subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [SkillOnStudentAssignmentController],
  providers: [
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    ClassService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
  ],
})
export class SkillOnStudentAssignmentModule {}
