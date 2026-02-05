import { Module } from '@nestjs/common';
import { AssignmentVideoQuizController } from './assignment-video-quiz.controller';
import { AssignmentVideoQuizService } from './assignment-video-quiz.service';
import { AssignmentVideoQuizRepository } from './assignment-video-quiz.repository';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SubjectRepository } from '../subject/subject.repository';
import { AssignmentRepository } from '../assignment/assignment.repository';

@Module({
  controllers: [AssignmentVideoQuizController],
  providers: [
    AssignmentVideoQuizService,
    AssignmentVideoQuizRepository,
    TeacherOnSubjectService,
    SubjectRepository,
    AssignmentRepository,
  ],
})
export class AssignmentVideoQuizModule {}
