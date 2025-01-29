import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StudentOnSubjectService } from 'src/student-on-subject/student-on-subject.service';
import { WheelOfNameService } from 'src/wheel-of-name/wheel-of-name.service';

@Module({
  imports: [HttpModule],
  providers: [
    AssignmentService,
    TeacherOnSubjectService,
    StudentOnSubjectService,
    WheelOfNameService,
  ],
  controllers: [AssignmentController],
})
export class AssignmentModule {}
