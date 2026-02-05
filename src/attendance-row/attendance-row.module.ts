import { Module } from '@nestjs/common';
import { AttendanceRowService } from './attendance-row.service';
import { AttendanceRowController } from './attendance-row.controller';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';
import { SubjectService } from '../subject/subject.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { StudentService } from '../student/student.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { GradeService } from '../grade/grade.service';
import { UsersService } from '../users/users.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { AssignmentService } from '../assignment/assignment.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

@Module({
  imports: [HttpModule],
  providers: [
    AttendanceRowService,
    StudentOnSubjectService,
    TeacherOnSubjectService,
    WheelOfNameService,
    AttendanceStatusListService,
    SubjectService,
    AttendanceTableService,
    ClassService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    GradeService,
    UsersService,
    SkillOnStudentAssignmentService,
    AssignmentService,
    SkillService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    FileAssignmentService,
    SubscriptionService,
    AssignmentVideoQuizRepository,
  ],
  controllers: [AttendanceRowController],
})
export class AttendanceRowModule {}
