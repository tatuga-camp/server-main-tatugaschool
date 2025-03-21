import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateStudentOnAssignment,
  RequestDeleteStudentOnAssignment,
  RequestGetStudentOnAssignmentByAssignmentId,
  RequestGetStudentOnAssignmentById,
  RequestGetStudentOnAssignmentByStudentId,
  RequestGetStudentOnAssignmentByStudentIdAndAssignmentId,
} from './interfaces';
import { Prisma, StudentOnAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type StudentOnAssignmentRepositoryType = {
  getById(
    request: RequestGetStudentOnAssignmentById,
  ): Promise<StudentOnAssignment>;
  findMany(
    request: Prisma.StudentOnAssignmentFindManyArgs,
  ): Promise<StudentOnAssignment[]>;
  getByStudentId(
    request: RequestGetStudentOnAssignmentByStudentId,
  ): Promise<StudentOnAssignment[]>;
  getByAssignmentId(
    request: RequestGetStudentOnAssignmentByAssignmentId,
  ): Promise<StudentOnAssignment[]>;
  getByStudentIdAndAssignmentId(
    request: RequestGetStudentOnAssignmentByStudentIdAndAssignmentId,
  ): Promise<StudentOnAssignment>;
  create(
    request: RequestCreateStudentOnAssignment,
  ): Promise<StudentOnAssignment>;
  createMany(
    request: Prisma.StudentOnAssignmentCreateManyArgs,
  ): Promise<Prisma.BatchPayload>;
  update(
    request: Prisma.StudentOnAssignmentUpdateArgs,
  ): Promise<StudentOnAssignment>;
  updateMany(
    request: Prisma.StudentOnAssignmentUpdateManyArgs,
  ): Promise<Prisma.BatchPayload>;
  delete(
    request: RequestDeleteStudentOnAssignment,
  ): Promise<{ message: string }>;
  deleteByAssignmentId(request: {
    assignmentId: string;
  }): Promise<{ message: string }>;
};
@Injectable()
export class StudentOnAssignmentRepository
  implements StudentOnAssignmentRepositoryType
{
  logger: Logger = new Logger(StudentOnAssignmentRepository.name);
  constructor(private prisma: PrismaService) {}

  async findMany(
    request: Prisma.StudentOnAssignmentFindManyArgs,
  ): Promise<StudentOnAssignment[]> {
    try {
      return await this.prisma.studentOnAssignment.findMany(request);
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
    request: RequestGetStudentOnAssignmentById,
  ): Promise<StudentOnAssignment> {
    try {
      return await this.prisma.studentOnAssignment.findUnique({
        where: {
          id: request.studentOnAssignmentId,
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

  async getByStudentId(
    request: RequestGetStudentOnAssignmentByStudentId,
  ): Promise<StudentOnAssignment[]> {
    try {
      return await this.prisma.studentOnAssignment.findMany({
        where: {
          studentId: request.studentId,
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

  async getByAssignmentId(
    request: RequestGetStudentOnAssignmentByAssignmentId,
  ): Promise<StudentOnAssignment[]> {
    try {
      return await this.prisma.studentOnAssignment.findMany({
        where: {
          assignmentId: request.assignmentId,
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

  async getByStudentIdAndAssignmentId(
    request: RequestGetStudentOnAssignmentByStudentIdAndAssignmentId,
  ): Promise<StudentOnAssignment> {
    try {
      return await this.prisma.studentOnAssignment.findFirst({
        where: {
          studentId: request.studentId,
          assignmentId: request.assignmentId,
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
    request: RequestCreateStudentOnAssignment,
  ): Promise<StudentOnAssignment> {
    try {
      return await this.prisma.studentOnAssignment.create({
        data: request,
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Duplicate student on assignment');
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async createMany(
    request: Prisma.StudentOnAssignmentCreateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      const create = await this.prisma.studentOnAssignment.createMany(request);
      return create;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Duplicate student on assignment');
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(
    request: Prisma.StudentOnAssignmentUpdateArgs,
  ): Promise<StudentOnAssignment> {
    try {
      return await this.prisma.studentOnAssignment.update(request);
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

  async updateMany(
    request: Prisma.StudentOnAssignmentUpdateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.studentOnAssignment.updateMany(request);
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
    request: RequestDeleteStudentOnAssignment,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.studentOnAssignment.delete({
        where: {
          id: request.studentOnAssignmentId,
        },
      });
      return { message: 'Student on assignment deleted successfully' };
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

  async deleteByAssignmentId(request: {
    assignmentId: string;
  }): Promise<{ message: string }> {
    try {
      await this.prisma.studentOnAssignment.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });
      return { message: 'Student on assignment deleted successfully' };
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
