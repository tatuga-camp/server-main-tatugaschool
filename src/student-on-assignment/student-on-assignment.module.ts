import { Module } from '@nestjs/common';
import { StudentOnAssignmentService } from './student-on-assignment.service';
import { StudentOnAssignmentController } from './student-on-assignment.controller';

@Module({
  providers: [StudentOnAssignmentService],
  controllers: [StudentOnAssignmentController]
})
export class StudentOnAssignmentModule {}
