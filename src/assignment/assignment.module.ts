import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [AssignmentService, TeacherOnSubjectService],
  controllers: [AssignmentController],
})
export class AssignmentModule {}
