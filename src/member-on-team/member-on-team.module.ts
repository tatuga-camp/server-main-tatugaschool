import { Module } from '@nestjs/common';
import { MemberOnTeamService } from './member-on-team.service';
import { MemberOnTeamController } from './member-on-team.controller';

@Module({
  providers: [MemberOnTeamService],
  controllers: [MemberOnTeamController]
})
export class MemberOnTeamModule {}
