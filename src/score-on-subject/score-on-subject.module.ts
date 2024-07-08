import { Module } from '@nestjs/common';
import { ScoreOnSubjectService } from './score-on-subject.service';
import { ScoreOnSubjectController } from './score-on-subject.controller';

@Module({
  providers: [ScoreOnSubjectService],
  controllers: [ScoreOnSubjectController]
})
export class ScoreOnSubjectModule {}
