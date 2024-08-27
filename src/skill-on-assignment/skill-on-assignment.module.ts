import { Module } from '@nestjs/common';
import { SkillOnAssignmentService } from './skill-on-assignment.service';
import { SkillOnAssignmentController } from './skill-on-assignment.controller';

@Module({
  providers: [SkillOnAssignmentService],
  controllers: [SkillOnAssignmentController]
})
export class SkillOnAssignmentModule {}
