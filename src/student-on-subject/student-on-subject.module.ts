import { Module } from '@nestjs/common';
import { StudentOnSubjectService } from './student-on-subject.service';
import { StudentOnSubjectController } from './student-on-subject.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [
    StudentOnSubjectService,
    TeacherOnSubjectService,
    WheelOfNameService,
  ],
  controllers: [StudentOnSubjectController],
})
export class StudentOnSubjectModule {}
