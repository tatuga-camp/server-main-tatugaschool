import { Module } from '@nestjs/common';
import { ScoreOnStudentService } from './score-on-student.service';
import { ScoreOnStudentController } from './score-on-student.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [ScoreOnStudentService, TeacherOnSubjectService],
  controllers: [ScoreOnStudentController],
})
export class ScoreOnStudentModule {}
