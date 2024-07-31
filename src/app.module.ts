import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { ConfigModule } from '@nestjs/config';
import { SchoolModule } from './school/school.module';
import { MemberOnSchoolModule } from './member-on-school/member-on-school.module';
import { GoogleStorageModule } from './google-storage/google-storage.module';
import { StripeModule } from './stripe/stripe.module';
import { AttendanceTableModule } from './attendance-table/attendance-table.module';
import { AttendanceRowModule } from './attendance-row/attendance-row.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ClassModule } from './class/class.module';
import { SubjectModule } from './subject/subject.module';
import { StudentOnSubjectModule } from './student-on-subject/student-on-subject.module';
import { StudentModule } from './student/student.module';
import { ScoreOnSubjectModule } from './score-on-subject/score-on-subject.module';
import { ScoreOnStudentModule } from './score-on-student/score-on-student.module';
import { TeamModule } from './team/team.module';
import { TeacherOnSubjectModule } from './teacher-on-subject/teacher-on-subject.module';
import { AssignmentModule } from './assignment/assignment.module';
import { FileAssignmentModule } from './file-assignment/file-assignment.module';
import { StudentOnAssignmentModule } from './student-on-assignment/student-on-assignment.module';
import { FileOnStudentAssignmentModule } from './file-on-student-assignment/file-on-student-assignment.module';
import { CommentAssignmentModule } from './comment-assignment/comment-assignment.module';
import { BoardModule } from './board-task/board/board.module';
import { SkillModule } from './skill/skill.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    EmailModule,
    MemberOnSchoolModule,
    TeamModule,
    BoardModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GoogleStorageModule,
    StripeModule,
    AttendanceTableModule,
    AttendanceRowModule,
    AttendanceModule,
    SchoolModule,
    ClassModule,
    StudentModule,
    SubjectModule,
    StudentOnSubjectModule,
    ScoreOnSubjectModule,
    ScoreOnStudentModule,
    TeacherOnSubjectModule,
    AssignmentModule,
    FileAssignmentModule,
    StudentOnAssignmentModule,
    FileOnStudentAssignmentModule,
    CommentAssignmentModule,
    SkillModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
