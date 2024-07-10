import { Module } from '@nestjs/common';
import { TeacherOnSubjectService } from './teacher-on-subject.service';
import { TeacherOnSubjectController } from './teacher-on-subject.controller';

@Module({
  providers: [TeacherOnSubjectService],
  controllers: [TeacherOnSubjectController]
})
export class TeacherOnSubjectModule {}
