import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassModule } from '../class/class.module';
import { GradeService } from '../grade/grade.service';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';
import { StudentModule } from '../student/student.module';
import { SubjectModule } from '../subject/subject.module';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UsersService } from '../users/users.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { AssignmentService } from '../assignment/assignment.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';

@Module({
  imports: [
    forwardRef(() => MemberOnSchoolModule),
    forwardRef(() => StudentModule),
    forwardRef(() => SubjectModule),
    forwardRef(() => ClassModule),
    HttpModule,
  ],
  providers: [
    SchoolService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    GradeService,
    UsersService,
    SubjectService,
    ClassService,
    AssignmentService,
    StudentOnSubjectService,
    SkillService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    SkillOnStudentAssignmentService,
    FileAssignmentService,
    AttendanceStatusListService,
  ],
  controllers: [SchoolController],
  exports: [SchoolService],
})
export class SchoolModule {}
