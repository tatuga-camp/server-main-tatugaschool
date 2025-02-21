import { forwardRef, Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { ClassRepository } from './class.repository';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';
import { SchoolModule } from '../school/school.module';

@Module({
  imports: [
    forwardRef(() => SchoolModule),
    forwardRef(() => MemberOnSchoolModule),
  ],
  providers: [ClassService, ClassRepository],
  controllers: [ClassController],
})
export class ClassModule {}
