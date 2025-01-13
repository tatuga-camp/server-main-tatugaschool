import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentRepository } from './student.repository';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { UsersService } from '../users/users.service';
import { ClassService } from '../class/class.service';

@Module({
  providers: [
    StudentService,
    StudentRepository,
    MemberOnSchoolService,
    UsersService,
    ClassService,
  ],
  controllers: [StudentController],
})
export class StudentModule {}
