import { forwardRef, Module } from '@nestjs/common';
import { MemberOnSchoolModule } from '../member-on-school/member-on-school.module';
import { SchoolController } from './school.controller';
import { SchoolService } from './school.service';

@Module({
  imports: [forwardRef(() => MemberOnSchoolModule)],
  providers: [SchoolService],
  controllers: [SchoolController],
  exports: [SchoolService],
})
export class SchoolModule {}
