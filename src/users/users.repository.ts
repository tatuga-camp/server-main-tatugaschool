import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import {
  RequestCreateUser,
  RequestFindByEmail,
  RequestFindByResetToken,
  RequestFindByVerifyToken,
  RequestUpdateLastActiveAt,
  RequestUpdatePassword,
  RequestUpdateResetToken,
  RequestUpdateVerified,
} from './interfaces';

export type UserRepositoryType = {
  findByEmail(request: RequestFindByEmail): Promise<User>;
  updateResetToken(request: RequestUpdateResetToken): Promise<void>;
  createUser(request: RequestCreateUser): Promise<User>;
  findByVerifyToken(request: RequestFindByVerifyToken): Promise<User>;
  updateVerified(request: RequestUpdateVerified): Promise<void>;
  findByResetToken(request: RequestFindByResetToken): Promise<User>;
  updatePassword(request: RequestUpdatePassword): Promise<void>;
  updateLastActiveAt(request: RequestUpdateLastActiveAt): Promise<void>;
};

@Injectable()
export class UserRepository implements UserRepositoryType {
  logger: Logger = new Logger(UserRepository.name);
  constructor(private prisma: PrismaService) {}

  async findByEmail(request: RequestFindByEmail): Promise<User> {
    try {
      return this.prisma.user.findUnique({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateResetToken(request: RequestUpdateResetToken): Promise<void> {
    try {
      await this.prisma.user.update({
        where: {
          ...request.query,
        },
        data: {
          ...request.data,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createUser(request: RequestCreateUser): Promise<User> {
    try {
      return this.prisma.user.create({
        data: {
          ...request,
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findByVerifyToken(request: RequestFindByVerifyToken): Promise<User> {
    try {
      return this.prisma.user.findFirst({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateVerified(request: RequestUpdateVerified): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email: request.email },
        data: {
          isVerifyEmail: true,
          verifyEmailToken: null,
          verifyEmailTokenExpiresAt: null,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findByResetToken(request: RequestFindByResetToken): Promise<User> {
    try {
      return this.prisma.user.findFirst({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updatePassword(request: RequestUpdatePassword): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email: request.email },
        data: {
          password: request.password,
          resetPasswordToken: null,
          resetPasswordTokenExpiresAt: null,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateLastActiveAt(request: RequestUpdateLastActiveAt): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { ...request },
        data: {
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
