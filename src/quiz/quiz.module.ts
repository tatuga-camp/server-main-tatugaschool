import { Module } from '@nestjs/common';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SubjectRepository } from '../subject/subject.repository';
import { AssignmentRepository } from '../assignment/assignment.repository';
import { QuizAccess } from './quiz-access';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';

@Module({
  controllers: [QuizController],
  providers: [
    QuizService,
    QuizAccess,
    TeacherOnSubjectService,
    SubjectRepository,
    AssignmentRepository,
  ],
})
export class QuizModule {}
