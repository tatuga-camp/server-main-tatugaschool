import { Module } from '@nestjs/common';
import { StudentOnAssignmentService } from './student-on-assignment.service';
import { StudentOnAssignmentController } from './student-on-assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [StudentOnAssignmentService, TeacherOnSubjectService],
  controllers: [StudentOnAssignmentController],
})
export class StudentOnAssignmentModule {}
