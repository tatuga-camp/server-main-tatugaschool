import { Module } from '@nestjs/common';
import { FileAssignmentService } from './file-assignment.service';
import { FileAssignmentController } from './file-assignment.controller';
import { SchoolService } from '../school/school.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';

@Module({
  providers: [FileAssignmentService],
  controllers: [FileAssignmentController],
})
export class FileAssignmentModule {}
