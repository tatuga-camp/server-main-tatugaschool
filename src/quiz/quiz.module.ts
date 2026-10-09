import { Module } from '@nestjs/common';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { QuizAccess } from './quiz-access';
import { QuizController } from './quiz.controller';
import { QuizService } from './quiz.service';
import { QuizAttemptService } from './quiz-attempt.service';
import { QuizMonitorService } from './quiz-monitor.service';
import { StudentQuizService } from './student-quiz.service';
import { StudentQuizController } from './student-quiz.controller';
import { QuizIntegrityService } from '../quiz-integrity/quiz-integrity.service';
import { JevClient } from '../quiz-integrity/jev.client';

@Module({
  controllers: [QuizController, StudentQuizController],
  providers: [
    QuizService,
    QuizAttemptService,
    QuizMonitorService,
    StudentQuizService,
    QuizAccess,
    QuizIntegrityService,
    JevClient,
    TeacherOnSubjectService,
  ],
})
export class QuizModule {}
