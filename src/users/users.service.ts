import { Injectable, Logger } from '@nestjs/common';
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
}
