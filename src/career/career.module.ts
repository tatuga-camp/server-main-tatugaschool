import { Module } from '@nestjs/common';
import { CareerService } from './career.service';
import { CareerController } from './career.controller';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { GradeService } from '../grade/grade.service';
import { UsersService } from '../users/users.service';
import { AssignmentService } from '../assignment/assignment.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';

@Module({
  imports: [HttpModule],
  providers: [
    CareerService,
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    SubjectService,
    ClassService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    SkillService,
    GradeService,
    UsersService,
    AssignmentService,
    StudentOnSubjectService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    SkillOnStudentAssignmentService,
    FileAssignmentService,
    AttendanceStatusListService,
  ],
  controllers: [CareerController],
})
export class CareerModule {}
