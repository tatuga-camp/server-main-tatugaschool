import { MemberOnTeamService } from './member-on-team.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserGuard } from '../auth/guard';
import {
  CreateMembeOnTeamDto,
  DeleteMemberOnTeamDto,
  GetMemberOnTeamMyTeamIdDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@UseGuards(UserGuard)
@Controller('v1/member-on-teams')
export class MemberOnTeamController {
  constructor(private memberOnTeamService: MemberOnTeamService) {}

  @Get('team/:teamId')
  getByTeamId(@Param() dto: GetMemberOnTeamMyTeamIdDto, @GetUser() user: User) {
    return this.memberOnTeamService.getByTeamId(dto, user);
  }

  @Post()
  create(@Body() dto: CreateMembeOnTeamDto, @GetUser() user: User) {
    return this.memberOnTeamService.create(dto, user);
  }

  @Delete(':id')
  delete(@Param() dto: DeleteMemberOnTeamDto, @GetUser() user: User) {
    return this.memberOnTeamService.delete(dto, user);
  }
}
