import { Module } from '@nestjs/common';
import { StudentOnSubjectService } from './student-on-subject.service';
import { StudentOnSubjectController } from './student-on-subject.controller';

@Module({
  providers: [StudentOnSubjectService],
  controllers: [StudentOnSubjectController]
})
export class StudentOnSubjectModule {}
