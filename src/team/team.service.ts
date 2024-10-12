import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { MemberOnTeamRepository } from './../member-on-team/member-on-team.repository';
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
import { UsersService } from '../users/users.service';
import { GetTeamParamDto, GetTeamQueryDto } from './dto/get-team.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Pagination } from '../interfaces';

@Injectable()
export class TeamService {
  private logger: Logger = new Logger(TeamService.name);
  private memberOnTeamRepository: MemberOnTeamRepository =
    new MemberOnTeamRepository(this.prisma);
  private memberOnSchoolRepository: MemberOnSchoolRepository =
    new MemberOnSchoolRepository(this.prisma);
  constructor(
    private teamRepository: TeamRepository,
    private userService: UsersService,
    private prisma: PrismaService,
  ) {}

  async createTeam(dto: CreateTeamDto, user: User): Promise<Team> {
    try {
      const hasAccess = await this.userService.isAdminOfSchool(
        user.id,
        dto.schoolId,
      );

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to create a team in this school',
        );
      }

      const request = { data: dto };

      const createTeam = await this.teamRepository.create(request);

      const member = await this.memberOnTeamRepository.create({
        data: {
          teamId: createTeam.id,
          schoolId: createTeam.schoolId,
          userId: user.id,
          role: 'ADMIN',
          status: 'ACCEPT',
          memberOnSchoolId: hasAccess.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          photo: user.photo,
          phone: user.phone,
        },
      });

      return createTeam;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateTeam(updateTeamDto: UpdateTeamDto, user: User): Promise<Team> {
    try {
      const { query } = updateTeamDto;
      const { teamId } = query;
      const team = await this.teamRepository.findUnique({
        where: { id: teamId },
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
          'You do not have permission to update this team',
        );
      }

      const request = { teamId, data: updateTeamDto.body };
      this.logger.log('Updating team', request);
      return await this.teamRepository.update({
        where: { id: request.teamId },
        data: request.data,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteTeam(deleteTeamDto: DeleteTeamDto, user: User) {
    try {
      const { teamId } = deleteTeamDto;
      const team = await this.teamRepository.findUnique({
        where: { id: teamId },
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
      return await this.teamRepository.delete({ where: { id: teamId } });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getTeamById(teamId: string, user: User) {
    try {
      const team = await this.teamRepository.findUnique({
        where: { id: teamId },
      });
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
      throw error;
    }
  }

  async getTeamsBySchoolId(
    param: GetTeamParamDto,
    query: GetTeamQueryDto,
    user: User,
  ): Promise<Pagination<Team>> {
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

      const numbers = await this.teamRepository.counts({
        where: { schoolId: schoolId },
      });

      const totalPages = Math.ceil(numbers / limit);

      if (page > totalPages) {
        return {
          data: [],
          meta: {
            total: 1,
            lastPage: 1,
            currentPage: 1,
            prev: 1,
            next: 1,
          },
        };
      }

      const skip = (page - 1) * limit;

      const careers = await this.teamRepository.findMany({
        skip,
        take: limit,
      });

      return {
        data: careers,
        meta: {
          total: totalPages,
          lastPage: totalPages,
          currentPage: page,
          prev: page - 1 < 0 ? page : page - 1,
          next: page + 1 > totalPages ? page : page + 1,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
