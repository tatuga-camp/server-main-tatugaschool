import { forwardRef, Module } from '@nestjs/common';
import { MemberOnSchoolController } from './member-on-school.controller';
import { MemberOnSchoolPublicController } from './member-on-school-public.controller';
import { MemberOnSchoolService } from './member-on-school.service';
import { SchoolModule } from '../school/school.module';

@Module({
  imports: [forwardRef(() => SchoolModule)],
  providers: [MemberOnSchoolService],
  controllers: [MemberOnSchoolController, MemberOnSchoolPublicController],
  exports: [MemberOnSchoolService],
})
export class MemberOnSchoolModule {}
