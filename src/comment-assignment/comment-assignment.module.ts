import { Module } from '@nestjs/common';
import { CommentAssignmentService } from './comment-assignment.service';
import { CommentAssignmentController } from './comment-assignment.controller';

@Module({
  providers: [CommentAssignmentService],
  controllers: [CommentAssignmentController],
})
export class CommentAssignmentModule {}
