import { Module } from '@nestjs/common';
import { RubricService } from './rubric.service';
import { RubricController } from './rubric.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Module({
  providers: [RubricService, TeacherOnSubjectService],
  controllers: [RubricController],
})
export class RubricModule {}
