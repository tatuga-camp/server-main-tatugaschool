import { Module } from '@nestjs/common';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SubjectRepository } from '../subject/subject.repository';
import { AssignmentRepository } from '../assignment/assignment.repository';
import { QuizAccess } from './quiz-access';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizAttemptService } from './quiz-attempt.service';
import { StudentQuizService } from './student-quiz.service';
import { StudentQuizController } from './student-quiz.controller';
import { QuizIntegrityService } from '../quiz-integrity/quiz-integrity.service';
import { JevClient } from '../quiz-integrity/jev.client';

@Module({
  controllers: [QuizController, StudentQuizController],
  providers: [
    QuizService,
    QuizAttemptService,
    StudentQuizService,
    QuizAccess,
    QuizIntegrityService,
    JevClient,
    TeacherOnSubjectService,
    SubjectRepository,
    AssignmentRepository,
  ],
})
export class QuizModule {}
