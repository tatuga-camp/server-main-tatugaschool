import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { SchoolService } from '../school/school.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';

@Module({
  controllers: [WebhooksController],
  providers: [WebhooksService, SchoolService, MemberOnSchoolService],
})
export class WebhooksModule {}
