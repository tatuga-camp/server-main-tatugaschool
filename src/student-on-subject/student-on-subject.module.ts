import { Module } from '@nestjs/common';
import { StudentOnSubjectService } from './student-on-subject.service';
import { StudentOnSubjectController } from './student-on-subject.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [StudentOnSubjectService, TeacherOnSubjectService],
  controllers: [StudentOnSubjectController],
})
export class StudentOnSubjectModule {}
