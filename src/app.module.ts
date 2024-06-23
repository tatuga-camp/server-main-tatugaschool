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
import { SubjectModule } from './subject/subject.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    EmailModule,
    MemberOnSchoolModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GoogleStorageModule,
    StripeModule,
    AttendanceTableModule,
    AttendanceRowModule,
    AttendanceModule,
    SchoolModule,
    SubjectModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
