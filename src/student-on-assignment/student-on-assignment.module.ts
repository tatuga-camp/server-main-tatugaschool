import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { StudentOnAssignmentController } from './student-on-assignment.controller';
import { StudentOnAssignmentService } from './student-on-assignment.service';
import { GradeService } from '../grade/grade.service';
import { UsersService } from '../users/users.service';
import { AssignmentService } from '../assignment/assignment.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { SubscriptionService } from '../subscription/subscription.service';

@Module({
  imports: [HttpModule],
  providers: [
    StudentOnAssignmentService,
    TeacherOnSubjectService,
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    ClassService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    GradeService,
    UsersService,
    AssignmentService,
    StudentOnSubjectService,
    SkillService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    FileAssignmentService,
    AttendanceStatusListService,
    SubscriptionService,
  ],
  controllers: [StudentOnAssignmentController],
})
export class StudentOnAssignmentModule {}
