import { Module } from '@nestjs/common';
import { CommentAssignmentService } from './comment-assignment.service';
import { CommentAssignmentController } from './comment-assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [CommentAssignmentService, TeacherOnSubjectService],
  controllers: [CommentAssignmentController],
})
export class CommentAssignmentModule {}
