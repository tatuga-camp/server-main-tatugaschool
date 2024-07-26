import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { DeleteTeamDto } from './dto/delete-team.dto';
import { TeamService } from './team.service';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorators';
import { GetTeamParamDto, GetTeamQueryDto } from './dto/get-team.dto';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/teams')
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Post()
  async createTeam(
    @Body() createTeamDto: CreateTeamDto,
    @GetUser() user: User,
  ) {
    return this.teamService.createTeam(createTeamDto, user);
  }

  @Patch()
  async updateTeam(
    @Body() updateTeamDto: UpdateTeamDto,
    @GetUser() user: User,
  ) {
    return this.teamService.updateTeam(updateTeamDto, user);
  }

  @Delete(':teamId')
  async deleteTeam(
    @Param() deleteTeamDto: DeleteTeamDto,
    @GetUser() user: User,
  ) {
    console.log('deleteTeamDto', deleteTeamDto);
    return this.teamService.deleteTeam(deleteTeamDto, user);
  }

  @Get(':teamId')
  async getTeamById(@Param('teamId') teamId: string, @GetUser() user: User) {
    return this.teamService.getTeamById(teamId, user);
  }

  @Get('school/:schoolId')
  async getTeamsBySchoolId(
    @Param() param: GetTeamParamDto,
    @Query() query: GetTeamQueryDto,
    @GetUser() user: User,
  ) {
    return this.teamService.getTeamsBySchoolId(param, query, user);
  }
}
