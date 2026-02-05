import { Module, forwardRef } from '@nestjs/common';
import { StudentOnSubjectService } from './student-on-subject.service';
import { StudentOnSubjectController } from './student-on-subject.controller';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { HttpModule } from '@nestjs/axios';
import { SchoolService } from '../school/school.service';
import { GradeService } from '../grade/grade.service';
import { SkillOnStudentAssignmentService } from '../skill-on-student-assignment/skill-on-student-assignment.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { StudentService } from '../student/student.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { UsersService } from '../users/users.service';
import { SchoolModule } from '../school/school.module';
import { AssignmentService } from '../assignment/assignment.service';
import { SkillService } from '../skill/skill.service';
import { SkillOnAssignmentService } from '../skill-on-assignment/skill-on-assignment.service';
import { ScoreOnSubjectService } from '../score-on-subject/score-on-subject.service';
import { ScoreOnStudentService } from '../score-on-student/score-on-student.service';
import { FileAssignmentService } from '../file-assignment/file-assignment.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { AssignmentVideoQuizRepository } from '../assignment-video-quiz/assignment-video-quiz.repository';

@Module({
  imports: [HttpModule, forwardRef(() => SchoolModule)],
  providers: [
    StudentOnSubjectService,
    TeacherOnSubjectService,
    WheelOfNameService,
    GradeService,
    SkillOnStudentAssignmentService,
    MemberOnSchoolService,
    SubjectService,
    StudentService,
    ClassService,
    AttendanceTableService,
    UsersService,
    AssignmentService,
    SkillService,
    SkillOnAssignmentService,
    ScoreOnSubjectService,
    ScoreOnStudentService,
    FileAssignmentService,
    AttendanceStatusListService,
    ScoreOnSubjectService,
    AssignmentVideoQuizRepository,
  ],
  controllers: [StudentOnSubjectController],
})
export class StudentOnSubjectModule {}
