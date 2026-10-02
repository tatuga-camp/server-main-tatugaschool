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
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

type CommentAssignmentRepositoryType = {
  findMany(
    request: Prisma.CommentOnAssignmentFindManyArgs,
  ): Promise<CommentOnAssignment[]>;
  getById(
    request: RequestGetCommentAssignmentById,
  ): Promise<CommentOnAssignment>;
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
    private cache: CacheService,
  ) {}

  async findMany(
    request: Prisma.CommentOnAssignmentFindManyArgs,
  ): Promise<CommentOnAssignment[]> {
    try {
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

  async create(
    request: RequestCreateCommentAssignment,
  ): Promise<CommentOnAssignment> {
    try {
      const result = await this.prisma.commentOnAssignment.create({
        data: request,
      });
      await this.cache.bump(subjectScope(result.subjectId, 'submissions'));

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
      await this.cache.bump(subjectScope(result.subjectId, 'submissions'));
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
      await this.cache.bump(subjectScope(result.subjectId, 'submissions'));
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
}
