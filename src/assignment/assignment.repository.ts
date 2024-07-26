import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateAssignment,
  RequestDeleteAssignment,
  RequestGetAssignmentById,
  RequestGetAssignmentBySubjectId,
  RequestUpdateAssignment,
} from './interfaces';
import { Assignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type AssignmentRepositoryType = {
  getAssignmentById(request: RequestGetAssignmentById): Promise<Assignment>;
  getAssignmentBySubjectId(
    request: RequestGetAssignmentBySubjectId,
  ): Promise<Assignment[]>;
  createAssignment(request: RequestCreateAssignment): Promise<Assignment>;
  updateAssignment(request: RequestUpdateAssignment): Promise<Assignment>;
  deleteAssignment(
    request: RequestDeleteAssignment,
  ): Promise<{ message: string }>;
};
@Injectable()
export class AssignmentRepository implements AssignmentRepositoryType {
  logger: Logger = new Logger(AssignmentRepository.name);
  constructor(private prisma: PrismaService) {}

  async getAssignmentById(
    request: RequestGetAssignmentById,
  ): Promise<Assignment> {
    try {
      return await this.prisma.assignment.findUnique({
        where: {
          id: request.assignmentId,
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

  async getAssignmentBySubjectId(
    request: RequestGetAssignmentBySubjectId,
  ): Promise<Assignment[]> {
    try {
      return await this.prisma.assignment.findMany({
        where: {
          subjectId: request.subjectId,
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

  async createAssignment(
    request: RequestCreateAssignment,
  ): Promise<Assignment> {
    try {
      return await this.prisma.assignment.create({
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

  async updateAssignment(
    request: RequestUpdateAssignment,
  ): Promise<Assignment> {
    try {
      return await this.prisma.assignment.update({
        where: {
          id: request.query.assignmentId,
        },
        data: request.data,
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

  async deleteAssignment(
    request: RequestDeleteAssignment,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.assignment.delete({
        where: {
          id: request.assignmentId,
        },
      });

      return { message: 'Deleted Assignment Successfully' };
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
