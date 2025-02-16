import { Module } from '@nestjs/common';
import { StudentOnAssignmentService } from './student-on-assignment.service';
import { StudentOnAssignmentController } from './student-on-assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';

@Module({
  providers: [
    StudentOnAssignmentService,
    TeacherOnSubjectService,
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SchoolService,
  ],
  controllers: [StudentOnAssignmentController],
})
export class StudentOnAssignmentModule {}
