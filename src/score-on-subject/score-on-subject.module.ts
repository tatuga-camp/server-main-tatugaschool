import { Module } from '@nestjs/common';
import { ScoreOnSubjectService } from './score-on-subject.service';
import { ScoreOnSubjectController } from './score-on-subject.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [ScoreOnSubjectService, TeacherOnSubjectService],
  controllers: [ScoreOnSubjectController],
})
export class ScoreOnSubjectModule {}
