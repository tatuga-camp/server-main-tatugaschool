import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import {
  RequestCreateUser,
  RequestFindByEmail,
  RequestFindById,
  RequestFindByResetToken,
  RequestFindByVerifyToken,
  RequestUpdateLastActiveAt,
  RequestUpdatePassword,
  RequestUpdateResetToken,
  RequestUpdateUser,
  RequestUpdateVerified,
} from './interfaces';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type UserRepositoryType = {
  findById(request: RequestFindById): Promise<User>;
  findByEmail(request: RequestFindByEmail): Promise<User>;
  update(request: RequestUpdateUser): Promise<User>;
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

  async findById(request: RequestFindById): Promise<User> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByEmail(request: RequestFindByEmail): Promise<User> {
    try {
      return await this.prisma.user.findUnique({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(request: RequestUpdateUser): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: request.query.userId,
        },
        data: request.body,
      });

      await Promise.allSettled([
        this.prisma.memberOnSchool.updateMany({
          where: {
            userId: user.id,
          },
          data: request.body,
        }),
        this.prisma.memberOnTeam.updateMany({
          where: {
            userId: user.id,
          },
          data: request.body,
        }),
        this.prisma.teacherOnSubject.updateMany({
          where: {
            userId: user.id,
          },
          data: request.body,
        }),
        this.prisma.commentOnAssignment.updateMany({
          where: {
            userId: user.id,
          },
          data: request.body,
        }),
      ]);

      return user;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
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
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async createUser(request: RequestCreateUser): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: {
          ...request,
          lastActiveAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByVerifyToken(request: RequestFindByVerifyToken): Promise<User> {
    try {
      return await this.prisma.user.findFirst({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
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
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByResetToken(request: RequestFindByResetToken): Promise<User> {
    try {
      return await this.prisma.user.findFirst({
        where: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
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
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
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
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
