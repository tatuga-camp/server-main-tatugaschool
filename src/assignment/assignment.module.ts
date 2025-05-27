import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { SubjectService } from '../subject/subject.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { StudentService } from '../student/student.service';
import { GradeService } from '../grade/grade.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { UsersService } from '../users/users.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';

@Module({
  imports: [HttpModule],
  providers: [
    AssignmentService,
    TeacherOnSubjectService,
    StudentOnSubjectService,
    WheelOfNameService,
    SkillService,
    SkillOnAssignmentService,
    SubjectService,
    AttendanceTableService,
    ClassService,
    MemberOnSchoolService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    SchoolService,
    StudentService,
    GradeService,
    UsersService,
    SkillOnStudentAssignmentService,
  ],
  controllers: [AssignmentController],
})
export class AssignmentModule {}
