import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SchoolService } from '../school/school.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';

@Module({
  providers: [SubscriptionService, SchoolService, MemberOnSchoolService],
  controllers: [SubscriptionController],
})
export class SubscriptionModule {}
