import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserRepository } from './users.repository';
import { GetUserByEmailDto, UpdatePasswordDto, UpdateUserDto } from './dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {
  logger: Logger = new Logger(UsersService.name);
  userRepository: UserRepository = new UserRepository(this.prisma);
  constructor(private prisma: PrismaService) {}

  async GetUser(user: User): Promise<User> {
    try {
      return user;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async GetUserByEmail(dto: GetUserByEmailDto): Promise<User[] | []> {
    try {
      return await this.userRepository
        .findMany({
          take: 5,
          where: {
            email: {
              contains: dto.email,
            },
            isVerifyEmail: true,
          },
        })
        .then((users) => {
          return users.map((user) => {
            delete user.password;
            delete user.resetPasswordToken;
            delete user.verifyEmailToken;
            return user;
          });
        });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateUser(dto: UpdateUserDto, user: User): Promise<User> {
    try {
      return await this.userRepository.update({
        where: {
          id: user.id,
        },
        data: dto,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updatePassword(dto: UpdatePasswordDto, user: User): Promise<User> {
    try {
      const getUser = await this.prisma.user.findUnique({
        where: {
          id: user.id,
        },
      });
      if (!getUser) {
        throw new ForbiddenException('User not found');
      }
      const isMatch = await bcrypt.compare(
        dto.currentPassword,
        getUser.password,
      );

      if (!isMatch) {
        throw new ForbiddenException('Current Password is incorrect');
      }

      const newPassword = await bcrypt.hash(dto.newPassword, 10);

      return await this.userRepository.update({
        where: {
          id: user.id,
        },
        data: {
          password: newPassword,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<User> {
    try {
      return await this.prisma.user.findUnique({ where: { id } });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async isAdminOfSchool(id: string, schoolId: string) {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: id,
          schoolId: schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException(
          'Access denied: User is not a member of the school',
        );
      }

      if (memberOnSchool.role !== 'ADMIN') {
        throw new ForbiddenException('Access denied: User is not an admin');
      }

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async isMemberOfSchool(id: string, schoolId: string) {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: id,
          schoolId: schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException(
          'Access denied: User is not a member of the school',
        );
      }

      return memberOnSchool;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async isMemberOfTeam({
    userId,
    teamId,
  }: {
    userId: string;
    teamId: string;
  }): Promise<boolean> {
    try {
      const memberOnTeam = await this.prisma.memberOnTeam.findFirst({
        where: {
          userId,
          teamId,
        },
      });

      if (!memberOnTeam) {
        throw new ForbiddenException(
          'Access denied: User is not a member of the team',
        );
      }

      return true;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
