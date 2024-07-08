import { Module } from '@nestjs/common';
import { ScoreOnStudentService } from './score-on-student.service';
import { ScoreOnStudentController } from './score-on-student.controller';

@Module({
  providers: [ScoreOnStudentService],
  controllers: [ScoreOnStudentController]
})
export class ScoreOnStudentModule {}
