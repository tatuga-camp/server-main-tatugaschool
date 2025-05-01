import { Module } from '@nestjs/common';
import { StudentOnGroupService } from './student-on-group.service';
import { StudentOnGroupController } from './student-on-group.controller';

@Module({
  providers: [StudentOnGroupService],
  controllers: [StudentOnGroupController]
})
export class StudentOnGroupModule {}
