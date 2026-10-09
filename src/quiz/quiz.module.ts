import { Module } from '@nestjs/common';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SubjectRepository } from '../subject/subject.repository';
import { AssignmentRepository } from '../assignment/assignment.repository';
import { QuizAccess } from './quiz-access';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizIntegrityService } from '../quiz-integrity/quiz-integrity.service';
import { JevClient } from '../quiz-integrity/jev.client';

@Module({
  controllers: [QuizController],
  providers: [
    QuizService,
    QuizAccess,
    QuizIntegrityService,
    JevClient,
    TeacherOnSubjectService,
    SubjectRepository,
    AssignmentRepository,
  ],
})
export class QuizModule {}
