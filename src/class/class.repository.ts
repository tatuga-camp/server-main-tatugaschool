import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Class, Prisma } from '@prisma/client';
import {
  RequestCreateClass,
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
  RequestUpdateClass,
} from './interfaces/class.interface';
import { Pagination } from '../interfaces';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type Repository = {
  create(request: RequestCreateClass): Promise<Class>;
  update(request: Prisma.ClassUpdateArgs): Promise<Class>;
  findById(request: RequestGetClass): Promise<Class | null>;
  findAll(): Promise<Class[]>;
  findMany(request: Prisma.ClassFindManyArgs): Promise<Class[]>;
  delete(request: RequestDeleteClass): Promise<Class>;
};

@Injectable()
export class ClassRepository implements Repository {
  logger = new Logger(ClassRepository.name);
  constructor(private prisma: PrismaService) {}

  async findMany(request: Prisma.ClassFindManyArgs): Promise<Class[]> {
    try {
      return await this.prisma.class.findMany(request);
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

  async create(request: RequestCreateClass) {
    try {
      return await this.prisma.class.create({
        data: {
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

  async update(request: Prisma.ClassUpdateArgs): Promise<Class> {
    try {
      return await this.prisma.class.update(request);
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
