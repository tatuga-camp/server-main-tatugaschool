import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StudentOnSubjectService } from 'src/student-on-subject/student-on-subject.service';
import { WheelOfNameService } from 'src/wheel-of-name/wheel-of-name.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';

@Module({
  imports: [HttpModule],
  providers: [
    AssignmentService,
    TeacherOnSubjectService,
    StudentOnSubjectService,
    WheelOfNameService,
    SkillService,
    SkillOnAssignmentService,
  ],
  controllers: [AssignmentController],
})
export class AssignmentModule {}
