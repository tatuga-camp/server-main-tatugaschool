import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Class } from '@prisma/client';
import {
  RequestCreateClass,
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
  RequestReorderClass,
  RequestUpdateClass,
} from './interfaces/class.interface';
import { Pagination } from '../interfaces';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type ClassRepositoryType = {
  create(request: RequestCreateClass): Promise<Class>;
  update(request: RequestUpdateClass): Promise<Class>;
  findById(request: RequestGetClass): Promise<Class | null>;
  findAll(): Promise<Class[]>;
  findWithPagination(
    request: RequestGetClassByPage,
  ): Promise<{ data: Class[]; total: number; page: number; limit: number }>;
  reorder(request: RequestReorderClass): Promise<Class[]>;
  delete(request: RequestDeleteClass): Promise<Class>;
};

@Injectable()
export class ClassRepository {
  logger = new Logger(ClassRepository.name);
  constructor(private prisma: PrismaService) {}

  async create(request: RequestCreateClass) {
    try {
      const totalClass = await this.prisma.class.count({
        where: {
          schoolId: request.schoolId,
          educationYear: request.educationYear,
        },
      });
      return await this.prisma.class.create({
        data: {
          ...request,
          order: totalClass || 1,
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

  async update(request: RequestUpdateClass): Promise<Class> {
    try {
      return await this.prisma.class.update({
        where: {
          id: request.query.classId,
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

  async findById(request: RequestGetClass): Promise<Class | null> {
    try {
      return await this.prisma.class.findUnique({
        where: { id: request.classId },
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

  async findAll(): Promise<Class[]> {
    try {
      return await this.prisma.class.findMany();
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

  async findWithPagination(
    request: RequestGetClassByPage,
  ): Promise<Pagination<Class>> {
    try {
      const { page, limit } = request;
      const skip = (page - 1) * limit;
      const [data, count] = await Promise.all([
        this.prisma.class.findMany({
          skip,
          take: limit,
          where: {
            schoolId: request.schoolId,
          },
        }),
        this.prisma.class.count({
          where: {
            schoolId: request.schoolId,
          },
        }),
      ]);
      const total = Math.ceil(count / limit);
      if (page > total) {
        return {
          data: [],
          meta: {
            total: 1,
            lastPage: 1,
            currentPage: 1,
            prev: 1,
            next: 1,
          },
        };
      }
      return {
        data,
        meta: {
          total: total,
          lastPage: total,
          currentPage: page,
          prev: page - 1 < 0 ? page : page - 1,
          next: page + 1 > total ? page : page + 1,
        },
      };
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

  async reorder(request: RequestReorderClass): Promise<Class[]> {
    const { classIds } = request;

    try {
      const updateOperations = classIds.map((id, index) => ({
        where: { id },
        data: { order: index },
      }));

      const data = await this.prisma.$transaction(
        updateOperations.map((update) => this.prisma.class.update(update)),
      );

      return data;
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

  async delete(request: RequestDeleteClass): Promise<Class> {
    try {
      const deletedClass = await this.prisma.$transaction(async (prisma) => {
        await this.prisma.studentOnSubject.deleteMany({
          where: {
            classId: request.classId,
          },
        });
        await this.prisma.student.deleteMany({
          where: {
            classId: request.classId,
          },
        });
        await this.prisma.subject.deleteMany({
          where: {
            classId: request.classId,
          },
        });
        return prisma.class.delete({
          where: {
            id: request.classId,
          },
        });
      });

      return deletedClass;
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
