import { Module } from '@nestjs/common';
import { FileAssignmentService } from './file-assignment.service';
import { FileAssignmentController } from './file-assignment.controller';

@Module({
  providers: [FileAssignmentService],
  controllers: [FileAssignmentController]
})
export class FileAssignmentModule {}
