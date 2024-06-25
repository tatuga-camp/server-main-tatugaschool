import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentRepository } from './repository/student.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from 'src/users/users.module';
import { MemberOnSchoolService } from 'src/member-on-school/member-on-school.service';
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [
    StudentService,
    StudentRepository,
    MemberOnSchoolService,
    UsersService,
  ],
  controllers: [StudentController],
})
export class StudentModule {}
