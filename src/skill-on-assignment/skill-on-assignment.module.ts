import { Module } from '@nestjs/common';
import { SkillOnAssignmentService } from './skill-on-assignment.service';
import { SkillOnAssignmentController } from './skill-on-assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [SkillOnAssignmentService, TeacherOnSubjectService],
  controllers: [SkillOnAssignmentController],
})
export class SkillOnAssignmentModule {}
