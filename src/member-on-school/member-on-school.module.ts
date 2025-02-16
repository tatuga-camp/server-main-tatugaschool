import { forwardRef, Module } from '@nestjs/common';
import { MemberOnSchoolController } from './member-on-school.controller';
import { MemberOnSchoolService } from './member-on-school.service';
import { SchoolModule } from '../school/school.module';
@Module({
  imports: [forwardRef(() => SchoolModule)],
  providers: [MemberOnSchoolService],
  controllers: [MemberOnSchoolController],
  exports: [MemberOnSchoolService],
})
export class MemberOnSchoolModule {}
