import { forwardRef, Module } from '@nestjs/common';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';
import { SchoolModule } from '../school/school.module';
import { UsersService } from '../users/users.service';
import { ClassController } from './class.controller';
import { ClassRepository } from './class.repository';
import { ClassService } from './class.service';

@Module({
  imports: [
    forwardRef(() => SchoolModule),
    forwardRef(() => MemberOnSchoolModule),
  ],
  providers: [ClassService, ClassRepository, UsersService],
  controllers: [ClassController],
})
export class ClassModule {}
