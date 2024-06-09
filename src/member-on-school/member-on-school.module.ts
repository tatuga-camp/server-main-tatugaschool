import { Module } from '@nestjs/common';
import { MemberOnSchoolController } from './member-on-school.controller';
import { MemberOnSchoolService } from './member-on-school.service';

@Module({
  providers: [MemberOnSchoolService],
  controllers: [MemberOnSchoolController],
})
export class MemberOnSchoolModule {}
