import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Provider, User, UserRole } from '@prisma/client';

interface CreateUserModel {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: string;
  provider?: Provider;
}

@Injectable()
export class UserRepository {
  logger: Logger = new Logger(UserRepository.name);
  constructor(private prisma: PrismaService) {}
  async findByEmail(email: string): Promise<User> {
    try {
      return this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateResetToken(
    email: string,
    token: string,
    expiration: Date,
  ): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email },
        data: {
          resetPasswordToken: token,
          resetPasswordTokenExpiresAt: expiration,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createUser(
    data: CreateUserModel,
    photo: string,
    token: string,
    expiration: Date,
    password: string,
  ): Promise<User> {
    try {
      const value = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: password,
        role: UserRole.USER,
        photo: photo,
        lastActiveAt: new Date(),
        provider: data.provider,
        verifyEmailToken: token,
        verifyEmailTokenExpiresAt: expiration,
      };
      return this.prisma.user.create({
        data: value,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findByVerifyToken(token: string): Promise<User> {
    try {
      return this.prisma.user.findUnique({
        where: {
          verifyEmailToken: token,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateVerified(email: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email },
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

  async findByResetToken(token: string): Promise<User> {
    try {
      return this.prisma.user.findUnique({
        where: {
          resetPasswordToken: token,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updatePassword(email: string, password: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email },
        data: {
          password: password,
          resetPasswordToken: null,
          resetPasswordTokenExpiresAt: null,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateLastActiveAt(email: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { email },
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
