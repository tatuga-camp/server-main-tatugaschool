import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SchoolService } from '../school/school.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { StudentService } from '../student/student.service';
import { ClassService } from '../class/class.service';
import { SubjectService } from '../subject/subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { HttpModule } from '@nestjs/axios';
import { GradeService } from '../grade/grade.service';
import { UsersService } from '../users/users.service';
import { AssignmentService } from '../assignment/assignment.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

@Module({
  imports: [HttpModule],
  providers: [
    SubscriptionService,
    SchoolService,
    MemberOnSchoolService,
    StudentService,
    ClassService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    GradeService,
    UsersService,
    AssignmentService,
    StudentOnSubjectService,
    SkillService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    SkillOnStudentAssignmentService,
    FileAssignmentService,
    AttendanceStatusListService,
    AssignmentVideoQuizRepository,
  ],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}
