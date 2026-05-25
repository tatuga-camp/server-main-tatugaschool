import { Controller, Get, Param } from '@nestjs/common';
import { MemberOnSchoolService } from './member-on-school.service';

@Controller('v1/member-on-schools')
export class MemberOnSchoolPublicController {
  constructor(private memberOnSchoolService: MemberOnSchoolService) {}

  @Get('invitation/:token')
  async getInvitationByToken(@Param('token') token: string) {
    return this.memberOnSchoolService.getInvitationByToken(token);
  }
}
