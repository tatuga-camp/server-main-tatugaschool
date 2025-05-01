import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GroupOnSubject, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findFirst(
    request: Prisma.GroupOnSubjectFindFirstArgs,
  ): Promise<GroupOnSubject>;
  findMany(
    request: Prisma.GroupOnSubjectFindManyArgs,
  ): Promise<GroupOnSubject[]>;
  findUnique(
    request: Prisma.GroupOnSubjectFindUniqueArgs,
  ): Promise<GroupOnSubject>;
  update(request: Prisma.GroupOnSubjectUpdateArgs): Promise<GroupOnSubject>;
  delete(request: { groupOnSubjectId: string }): Promise<GroupOnSubject>;
};
@Injectable()
export class GroupOnSubjectRepository implements Repository {
  private logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(GroupOnSubjectRepository.name);
  }

  async findFirst(
    request: Prisma.GroupOnSubjectFindFirstArgs,
  ): Promise<GroupOnSubject> {
    try {
      return await this.prisma.groupOnSubject.findFirst(request);
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
    request: Prisma.GroupOnSubjectFindManyArgs,
  ): Promise<GroupOnSubject[]> {
    try {
      return await this.prisma.groupOnSubject.findMany(request);
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
    request: Prisma.GroupOnSubjectFindUniqueArgs,
  ): Promise<GroupOnSubject> {
    try {
      return await this.prisma.groupOnSubject.findUnique(request);
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
    request: Prisma.GroupOnSubjectUpdateArgs,
  ): Promise<GroupOnSubject> {
    try {
      return await this.prisma.groupOnSubject.update(request);
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

  async delete(request: { groupOnSubjectId: string }): Promise<GroupOnSubject> {
    try {
      await this.prisma.studentOnGroup.deleteMany({
        where: {
          groupOnSubjectId: request.groupOnSubjectId,
        },
      });

      await this.prisma.unitOnGroup.deleteMany({
        where: {
          groupOnSubjectId: request.groupOnSubjectId,
        },
      });

      return await this.prisma.groupOnSubject.delete({
        where: {
          id: request.groupOnSubjectId,
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
}
