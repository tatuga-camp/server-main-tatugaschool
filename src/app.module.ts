import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssignmentModule } from './assignment/assignment.module';
import { AttendanceRowModule } from './attendance-row/attendance-row.module';
import { AttendanceStatusListModule } from './attendance-status-list/attendance-status-list.module';
import { AttendanceTableModule } from './attendance-table/attendance-table.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { BoardModule } from './board-task/board/board.module';
import { CareerModule } from './career/career.module';
import { ClassModule } from './class/class.module';
import { CommentAssignmentModule } from './comment-assignment/comment-assignment.module';
import { EmailModule } from './email/email.module';
import { FeedbackModule } from './feedback/feedback.module';
import { FileAssignmentModule } from './file-assignment/file-assignment.module';
import { FileOnStudentAssignmentModule } from './file-on-student-assignment/file-on-student-assignment.module';
import { FileOnTeachingMaterialModule } from './file-on-teaching-material/file-on-teaching-material.module';
import { GradeModule } from './grade/grade.module';
import { GroupOnSubjectModule } from './group-on-subject/group-on-subject.module';
import { MemberOnSchoolModule } from './member-on-school/member-on-school.module';
import { MemberOnTeamModule } from './member-on-team/member-on-team.module';
import { PrismaModule } from './prisma/prisma.module';
import { SchoolModule } from './school/school.module';
import { ScoreOnStudentModule } from './score-on-student/score-on-student.module';
import { ScoreOnSubjectModule } from './score-on-subject/score-on-subject.module';
import { SkillOnAssignmentModule } from './skill-on-assignment/skill-on-assignment.module';
import { SkillOnCareerModule } from './skill-on-career/skill-on-career.module';
import { SkillOnStudentAssignmentModule } from './skill-on-student-assignment/skill-on-student-assignment.module';
import { SkillModule } from './skill/skill.module';
import { StripeModule } from './stripe/stripe.module';
import { StudentOnAssignmentModule } from './student-on-assignment/student-on-assignment.module';
import { StudentOnGroupModule } from './student-on-group/student-on-group.module';
import { StudentOnSubjectModule } from './student-on-subject/student-on-subject.module';
import { StudentModule } from './student/student.module';
import { SubjectModule } from './subject/subject.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TeacherOnSubjectModule } from './teacher-on-subject/teacher-on-subject.module';
import { TeachingMaterialModule } from './teaching-material/teaching-material.module';
import { TeamModule } from './team/team.module';
import { UnitOnGroupModule } from './unit-on-group/unit-on-group.module';
import { UsersModule } from './users/users.module';
import { AiModule } from './vector/ai.module';
import { PushModule } from './web-push/push.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { WheelOfNameModule } from './wheel-of-name/wheel-of-name.module';
import { StorageModule } from './storage/storage.module';
import { NotificationModule } from './notification/notification.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AssignmentVideoQuizModule } from './assignment-video-quiz/assignment-video-quiz.module';

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
    StorageModule,
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
    AiModule,
    SkillOnAssignmentModule,
    SkillOnStudentAssignmentModule,
    CareerModule,
    MemberOnTeamModule,
    SkillOnCareerModule,
    WheelOfNameModule,
    AttendanceStatusListModule,
    PushModule,
    WebhooksModule,
    SubscriptionModule,
    GradeModule,
    FeedbackModule,
    GroupOnSubjectModule,
    UnitOnGroupModule,
    StudentOnGroupModule,
    TeachingMaterialModule,
    FileOnTeachingMaterialModule,
    NotificationModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 1000 * 60,
          limit: process.env.NODE_ENV === 'production' ? 100 : 1000,
        },
      ],
    }),
    AssignmentVideoQuizModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
