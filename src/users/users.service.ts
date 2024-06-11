import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  logger: Logger = new Logger(UsersService.name);
  constructor() {}

  async GetUser(user: User): Promise<User> {
    try {
      return user;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
