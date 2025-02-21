import { forwardRef, Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { StudentRepository } from './student.repository';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { UsersService } from '../users/users.service';
import { ClassService } from '../class/class.service';
import { SchoolModule } from '../school/school.module';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';

@Module({
  imports: [
    forwardRef(() => SchoolModule),
    forwardRef(() => MemberOnSchoolModule),
  ],
  providers: [StudentService, StudentRepository, UsersService, ClassService],
  controllers: [StudentController],
  exports: [StudentService],
})
export class StudentModule {}
