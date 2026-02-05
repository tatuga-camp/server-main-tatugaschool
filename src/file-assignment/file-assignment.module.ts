import { forwardRef, Module } from '@nestjs/common';
import { SubjectService } from '../subject/subject.service';
import { FileAssignmentController } from './file-assignment.controller';
import { FileAssignmentService } from './file-assignment.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { HttpModule } from '@nestjs/axios';
import { StudentService } from '../student/student.service';
import { GradeService } from '../grade/grade.service';
import { UsersService } from '../users/users.service';
import { AssignmentService } from '../assignment/assignment.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { SubjectModule } from '../subject/subject.module';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

@Module({
  imports: [HttpModule, forwardRef(() => SubjectModule)],
  providers: [
    FileAssignmentService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    ClassService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
    GradeService,
    UsersService,
    AssignmentService,
    SkillService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    StudentOnSubjectService,
    SkillOnStudentAssignmentService,
    AttendanceStatusListService,
    SubscriptionService,
    AssignmentVideoQuizRepository,
  ],
  controllers: [FileAssignmentController],
})
export class FileAssignmentModule {}
