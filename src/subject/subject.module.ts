import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';
import { SchoolModule } from '../school/school.module';
import { StudentService } from '../student/student.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { SubjectController } from './subject.controller';
import { SubjectService } from './subject.service';
import { GradeService } from '../grade/grade.service';
import { GradeModule } from '../grade/grade.module';
import { UsersService } from '../users/users.service';
import { AssignmentService } from '../assignment/assignment.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { AssignmentModule } from '../assignment/assignment.module';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => SchoolModule),
    forwardRef(() => MemberOnSchoolModule),
    forwardRef(() => GradeModule),
    forwardRef(() => AssignmentModule),
  ],
  providers: [
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    ClassService,
    StudentService,
    GradeService,
    UsersService,
    StudentOnSubjectService,
    SkillService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    SkillOnStudentAssignmentService,
    AssignmentService,
    FileAssignmentService,
    AttendanceStatusListService,
  ],
  controllers: [SubjectController],
})
export class SubjectModule {}
