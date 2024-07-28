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

type CommentAssignmentRepositoryType = {
  getById(
    request: RequestGetCommentAssignmentById,
  ): Promise<CommentOnAssignment>;
  getByStudentOnAssignmentId(
    request: RequestGetCommentByStudentOnAssignmentId,
  ): Promise<CommentOnAssignment[]>;
  create(request: RequestCreateCommentAssignment): Promise<CommentOnAssignment>;
  update(request: RequestUpdateCommentAssignment): Promise<CommentOnAssignment>;
  delete(request: RequestDeleteCommentAssignment): Promise<{ message: string }>;
};
@Injectable()
export class CommentAssignmentRepository
  implements CommentAssignmentRepositoryType
{
  logger: Logger = new Logger(CommentAssignmentRepository.name);
  constructor(private prisma: PrismaService) {}

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
      return await this.prisma.commentOnAssignment.create({
        data: request,
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

  async update(
    request: RequestUpdateCommentAssignment,
  ): Promise<CommentOnAssignment> {
    try {
      return await this.prisma.commentOnAssignment.update({
        where: {
          id: request.query.commentOnAssignmentId,
        },
        data: {
          ...request.body,
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

  async delete(
    request: RequestDeleteCommentAssignment,
  ): Promise<{ message: string }> {
    try {
      const { commentOnAssignmentId } = request;

      await this.prisma.commentOnAssignment.delete({
        where: {
          id: commentOnAssignmentId,
        },
      });

      return { message: 'Comment deleted successfully' };
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
