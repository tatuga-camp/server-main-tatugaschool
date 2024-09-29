import { Module } from '@nestjs/common';
import { SkillOnStudentAssignmentController } from './skill-on-student-assignment.controller';
import { SkillOnStudentAssignmentService } from './skill-on-student-assignment.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';

@Module({
  controllers: [SkillOnStudentAssignmentController],
  providers: [SkillOnStudentAssignmentService, MemberOnSchoolService],
})
export class SkillOnStudentAssignmentModule {}
