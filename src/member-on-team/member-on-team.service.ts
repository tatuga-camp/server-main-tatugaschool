import { MemberOnSchoolRepository } from './../member-on-school/member-on-school.repository';
import { UserRepository } from './../users/users.repository';
import { TeamRepository } from './../team/team.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MemberOnTeamRepository } from './member-on-team.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMembeOnTeamDto,
  DeleteMemberOnTeamDto,
  GetMemberOnTeamMyTeamIdDto,
} from './dto';
import { MemberOnTeam, Prisma, User } from '@prisma/client';

@Injectable()
export class MemberOnTeamService {
  memberOnTeamRepository: MemberOnTeamRepository = new MemberOnTeamRepository(
    this.prisma,
  );
  private teamRepository: TeamRepository = new TeamRepository(this.prisma);
  private logger: Logger = new Logger(MemberOnTeamService.name);
  private userRepository: UserRepository = new UserRepository(this.prisma);
  private memberOnSchoolRepository: MemberOnSchoolRepository =
    new MemberOnSchoolRepository(this.prisma);
  constructor(private prisma: PrismaService) {}

  async isMemberOnTeam({
    userId,
    teamId,
  }: {
    userId: string;
    teamId: string;
  }): Promise<MemberOnTeam | null> {
    try {
      if (!userId || !teamId) {
        throw new BadRequestException('userId or teamId is required');
      }
      const member = await this.memberOnTeamRepository.findFirst({
        where: {
          userId: userId,
          teamId: teamId,
        },
      });
      return member;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByTeamId(
    dto: GetMemberOnTeamMyTeamIdDto,
    user: User,
  ): Promise<MemberOnTeam[]> {
    try {
      const isMember = this.isMemberOnTeam({
        userId: user.id,
        teamId: dto.teamId,
      });

      if (!isMember) {
        throw new ForbiddenException('You are not a member of this team');
      }

      const members = await this.memberOnTeamRepository.findMany({
        where: {
          teamId: dto.teamId,
        },
      });
      return members;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateMembeOnTeamDto, user: User): Promise<MemberOnTeam> {
    try {
      const [team, targetUser] = await Promise.all([
        this.teamRepository.findUnique({
          where: {
            id: dto.teamId,
          },
        }),
        this.userRepository.findById({
          id: dto.userId,
        }),
      ]);

      if (!team) {
        throw new NotFoundException('Team not found');
      }
      if (!targetUser) {
        throw new NotFoundException('User not found');
      }

      const isMember = await this.isMemberOnTeam({
        userId: user.id,
        teamId: dto.teamId,
      });

      if (!isMember) {
        throw new ForbiddenException('You are not a member of this team');
      }

      if (isMember.role !== 'ADMIN') {
        throw new ForbiddenException(
          'You do not have permission to add member',
        );
      }

      const memberOnSchool = await this.memberOnSchoolRepository.findFirst({
        where: {
          userId: dto.userId,
          schoolId: team.schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException('User is not a member of this school');
      }

      const member = await this.memberOnTeamRepository.create({
        data: {
          ...dto,
          schoolId: team.schoolId,
          memberOnSchoolId: memberOnSchool.id,
          status: 'ACCEPT',
          role: dto.role,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          email: targetUser.email,
          photo: targetUser.photo,
          phone: targetUser.phone,
        },
      });

      return member;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteMemberOnTeamDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const member = await this.memberOnTeamRepository.findUnique({
        where: {
          id: dto.id,
        },
      });

      if (!member) {
        throw new NotFoundException('Member not found');
      }
      const isMember = await this.isMemberOnTeam({
        userId: user.id,
        teamId: member.teamId,
      });

      if (!isMember) {
        throw new ForbiddenException('You are not a member of this team');
      }

      if (isMember.role !== 'ADMIN' && member.userId !== user.id) {
        throw new ForbiddenException(
          'You do not have permission to delete member',
        );
      }

      await this.memberOnTeamRepository.delete({
        where: {
          id: dto.id,
        },
      });

      return { message: 'Member deleted successfully' };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
