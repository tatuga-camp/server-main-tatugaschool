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
import { RedisService } from '../redis/redis.service';

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
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {}

  async findMany(
    request: Prisma.StudentOnAssignmentFindManyArgs,
  ): Promise<StudentOnAssignment[]> {
    try {
      const subjectId = request.where?.subjectId;

      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.studentOnAssignment.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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
      const result = await this.prisma.studentOnAssignment.create({
        data: request,
      });
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        }
      }
      return result;
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

      const result = create;
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        }
      }
      return result;
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
      const result = await this.prisma.studentOnAssignment.update(request);
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        }
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

  async updateMany(
    request: Prisma.StudentOnAssignmentUpdateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      const result = await this.prisma.studentOnAssignment.updateMany(request);
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        }
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
    request: RequestDeleteStudentOnAssignment,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.studentOnAssignment.delete({
        where: {
          id: request.studentOnAssignmentId,
        },
      });

      const result = { message: 'Student on assignment deleted successfully' };
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        }
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

  async deleteByAssignmentId(request: {
    assignmentId: string;
  }): Promise<{ message: string }> {
    try {
      await this.prisma.studentOnAssignment.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      const result = { message: 'Student on assignment deleted successfully' };
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        }
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
    return `student_assignment_subjectId:${subjectId}`;
  }
}
