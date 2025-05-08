import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, StudentOnGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findFirst(
    request: Prisma.StudentOnGroupFindFirstArgs,
  ): Promise<StudentOnGroup>;
  findUnique(
    request: Prisma.StudentOnGroupFindUniqueArgs,
  ): Promise<StudentOnGroup>;
  findMany(
    request: Prisma.StudentOnGroupFindManyArgs,
  ): Promise<StudentOnGroup[]>;
  create(request: Prisma.StudentOnGroupCreateArgs): Promise<StudentOnGroup>;
  update(request: Prisma.StudentOnGroupUpdateArgs): Promise<StudentOnGroup>;
  delete(request: Prisma.StudentOnGroupDeleteArgs): Promise<StudentOnGroup>;
  deleteMany(
    request: Prisma.StudentOnGroupDeleteManyArgs,
  ): Promise<Prisma.BatchPayload>;
};
@Injectable()
export class StudentOnGroupRepository implements Repository {
  private logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(StudentOnGroupRepository.name);
  }

  async findFirst(
    request: Prisma.StudentOnGroupFindFirstArgs,
  ): Promise<StudentOnGroup> {
    try {
      return await this.prisma.studentOnGroup.findFirst(request);
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
  async findUnique(
    request: Prisma.StudentOnGroupFindUniqueArgs,
  ): Promise<StudentOnGroup> {
    try {
      return await this.prisma.studentOnGroup.findUnique(request);
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

  async findMany(
    request: Prisma.StudentOnGroupFindManyArgs,
  ): Promise<StudentOnGroup[]> {
    try {
      return await this.prisma.studentOnGroup.findMany(request);
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
    request: Prisma.StudentOnGroupCreateArgs,
  ): Promise<StudentOnGroup> {
    try {
      return await this.prisma.studentOnGroup.create(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'This student has already been in the group',
          );
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(
    request: Prisma.StudentOnGroupUpdateArgs,
  ): Promise<StudentOnGroup> {
    try {
      return await this.prisma.studentOnGroup.update(request);
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
    request: Prisma.StudentOnGroupDeleteArgs,
  ): Promise<StudentOnGroup> {
    try {
      return await this.prisma.studentOnGroup.delete(request);
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

  async deleteMany(
    request: Prisma.StudentOnGroupDeleteManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.studentOnGroup.deleteMany(request);
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
