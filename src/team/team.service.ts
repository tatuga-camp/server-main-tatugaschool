import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TeamRepository } from './team.repository';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { DeleteTeamDto } from './dto/delete-team.dto';
import { Team, User } from '@prisma/client';
import { UsersService } from 'src/users/users.service';
import { GetTeamParamDto, GetTeamQueryDto } from './dto/get-team.dto';

@Injectable()
export class TeamService {
  logger: Logger = new Logger('TeamService');
  constructor(
    private teamRepository: TeamRepository,
    private userService: UsersService,
  ) {}

  async createTeam(createTeamDto: CreateTeamDto, user: User) {
    try {
      const hasAccess = await this.userService.isAdminOfSchool(
        user.id,
        createTeamDto.schoolId,
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to create a team in this school',
        );
      }

      const request = { data: createTeamDto };
      this.logger.log('Creating team', request);
      return await this.teamRepository.create(request);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateTeam(updateTeamDto: UpdateTeamDto, user: User): Promise<Team> {
    try {
      const { query } = updateTeamDto;
      const { teamId } = query;
      const team = await this.teamRepository.findById({ teamId });
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const hasAccess = await this.userService.isAdminOfSchool(
        user.id,
        team.schoolId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to update this team',
        );
      }

      const request = { teamId, data: updateTeamDto.body };
      this.logger.log('Updating team', request);
      return await this.teamRepository.update(request);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteTeam(deleteTeamDto: DeleteTeamDto, user: User) {
    try {
      const { teamId } = deleteTeamDto;
      const team = await this.teamRepository.findById({
        teamId: teamId,
      });

      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const hasAccess = await this.userService.isAdminOfSchool(
        user.id,
        team.schoolId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to delete this team',
        );
      }

      this.logger.log('Deleting team', deleteTeamDto);
      return await this.teamRepository.delete({ teamId: deleteTeamDto.teamId });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getTeamById(teamId: string, user: User) {
    try {
      const team = await this.teamRepository.findById({ teamId });
      if (!team) {
        throw new NotFoundException('Team not found');
      }

      const hasAccess = await this.userService.isMemberOfSchool(
        user.id,
        team.schoolId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to view this team',
        );
      }

      this.logger.log('Getting team by id', teamId);
      return team;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getTeamsBySchoolId(
    param: GetTeamParamDto,
    query: GetTeamQueryDto,
    user: User,
  ) {
    try {
      const { schoolId } = param;
      const { page, limit } = query;
      const hasAccess = await this.userService.isMemberOfSchool(
        user.id,
        schoolId,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to view teams in this school',
        );
      }

      const request = { schoolId, page, limit };
      this.logger.log('Getting teams by school id', request);
      return await this.teamRepository.findBySchoolId(request);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
