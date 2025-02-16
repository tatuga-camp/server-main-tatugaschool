import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { ClassRepository } from './class.repository';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';

@Module({
  providers: [
    ClassService,
    ClassRepository,
    MemberOnSchoolService,
    SchoolService,
  ],
  controllers: [ClassController],
})
export class ClassModule {}
