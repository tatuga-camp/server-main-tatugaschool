import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateCommentAssignment,
  RequestDeleteCommentAssignment,
  RequestGetCommentAssignmentById,
  RequestGetCommentByStudentOnAssignmentId,
  RequestUpdateCommentAssignment,
} from './interfaces';
import { CommentOnAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { Prisma } from '@prisma/client';
import { RedisService } from '../redis/redis.service';

type CommentAssignmentRepositoryType = {
  findMany(
    request: Prisma.CommentOnAssignmentFindManyArgs,
  ): Promise<CommentOnAssignment[]>;
  getById(
    request: RequestGetCommentAssignmentById,
  ): Promise<CommentOnAssignment>;
  getByStudentOnAssignmentId(
    request: RequestGetCommentByStudentOnAssignmentId,
  ): Promise<CommentOnAssignment[]>;
  create(request: RequestCreateCommentAssignment): Promise<CommentOnAssignment>;
  update(request: RequestUpdateCommentAssignment): Promise<CommentOnAssignment>;
  delete(request: RequestDeleteCommentAssignment): Promise<CommentOnAssignment>;
};
@Injectable()
export class CommentAssignmentRepository
  implements CommentAssignmentRepositoryType
{
  logger: Logger = new Logger(CommentAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {}

  async findMany(
    request: Prisma.CommentOnAssignmentFindManyArgs,
  ): Promise<CommentOnAssignment[]> {
    try {
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.commentOnAssignment.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
      return await this.prisma.commentOnAssignment.findMany(request);
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

  async getById(
    request: RequestGetCommentAssignmentById,
  ): Promise<CommentOnAssignment> {
    try {
      return await this.prisma.commentOnAssignment.findUnique({
        where: {
          id: request.commentOnAssignmentId,
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

  async getByStudentOnAssignmentId(
    request: RequestGetCommentByStudentOnAssignmentId,
  ): Promise<CommentOnAssignment[]> {
    try {
      return await this.prisma.commentOnAssignment.findMany({
        where: {
          studentOnAssignmentId: request.studentOnAssignmentId,
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

  async create(
    request: RequestCreateCommentAssignment,
  ): Promise<CommentOnAssignment> {
    try {
      const result = await this.prisma.commentOnAssignment.create({
        data: request,
      });
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }

      return result;
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

  async update(
    request: RequestUpdateCommentAssignment,
  ): Promise<CommentOnAssignment> {
    try {
      const result = await this.prisma.commentOnAssignment.update({
        where: {
          id: request.query.commentOnAssignmentId,
        },
        data: {
          ...request.body,
        },
      });
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }
      return result;
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

  async delete(
    request: RequestDeleteCommentAssignment,
  ): Promise<CommentOnAssignment> {
    try {
      const { commentOnAssignmentId } = request;

      const result = await this.prisma.commentOnAssignment.delete({
        where: {
          id: commentOnAssignmentId,
        },
      });
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }
      return result;
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

  private getCacheKey(subjectId: string): string {
    return `subjectId:${subjectId}`;
  }
}
