import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  logger: Logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) {}

  async GetUser(user: User): Promise<User> {
    try {
      return user;
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
}
