import { Module } from '@nestjs/common';
import { SkillOnCareerService } from './skill-on-career.service';
import { SkillOnCareerController } from './skill-on-career.controller';

@Module({
  providers: [SkillOnCareerService],
  controllers: [SkillOnCareerController]
})
export class SkillOnCareerModule {}
