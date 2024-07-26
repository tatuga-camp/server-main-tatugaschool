import { Module } from '@nestjs/common';
import { FileOnStudentAssignmentService } from './file-on-student-assignment.service';
import { FileOnStudentAssignmentController } from './file-on-student-assignment.controller';

@Module({
  providers: [FileOnStudentAssignmentService],
  controllers: [FileOnStudentAssignmentController]
})
export class FileOnStudentAssignmentModule {}
