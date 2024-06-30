import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Class, User } from '@prisma/client';
import {
  RequestCreateClass,
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
  RequestReorderClass,
  RequestUpdateClass,
} from './interfaces/class.interface';

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
      return this.prisma.class.create({
        data: {
          ...request,
          order: totalClass || 1,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(request: RequestUpdateClass): Promise<Class> {
    try {
      return this.prisma.class.update({
        where: {
          id: request.query.classId,
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

  async findById(request: RequestGetClass): Promise<Class | null> {
    try {
      return this.prisma.class.findUnique({
        where: { id: request.classId },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(): Promise<Class[]> {
    try {
      return this.prisma.class.findMany();
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findWithPagination(
    request: RequestGetClassByPage,
  ): Promise<{ data: Class[]; total: number; page: number; limit: number }> {
    try {
      const { page, limit } = request;
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.prisma.class.findMany({
          skip,
          take: limit,
        }),
        this.prisma.class.count(),
      ]);

      return { data, total, page, limit };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorder(request: RequestReorderClass, user: User): Promise<Class[]> {
    try {
      const { classIds } = request;
      const updates = classIds.map(async (id, index) => {
        const classData = await this.prisma.class.findUnique({
          where: {
            id,
            AND: {
              school: {
                memberOnSchools: {
                  some: {
                    userId: user.id,
                    role: 'ADMIN',
                  },
                },
              },
            },
          },
        });

        if (!classData) {
          throw new ForbiddenException(
            `Permission denied for class with id ${id}`,
          );
        }
        return {
          where: { id },
          data: { order: index },
        };
      });

      const updateOperations = await Promise.all(updates);

      const data = await this.prisma.$transaction(
        updateOperations.map((update) => this.prisma.class.update(update)),
      );

      return data;
    } catch (error) {
      this.logger.error(error);
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

      console.log(
        'Class and related entities deleted successfully:',
        deletedClass,
      );
      return deletedClass;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
