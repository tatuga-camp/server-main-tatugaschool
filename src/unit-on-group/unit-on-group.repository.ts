import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, UnitOnGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findFirst(request: Prisma.UnitOnGroupFindFirstArgs): Promise<UnitOnGroup>;
  findUnique(request: Prisma.UnitOnGroupFindUniqueArgs): Promise<UnitOnGroup>;
  findMany(request: Prisma.UnitOnGroupFindManyArgs): Promise<UnitOnGroup[]>;
  create(request: Prisma.UnitOnGroupCreateArgs): Promise<UnitOnGroup>;
  update(request: Prisma.UnitOnGroupUpdateArgs): Promise<UnitOnGroup>;
  delete(request: { unitOnGroupId: string }): Promise<UnitOnGroup>;
};

@Injectable()
export class UnitOnGroupRepository implements Repository {
  private logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(UnitOnGroupRepository.name);
  }

  async findFirst(
    request: Prisma.UnitOnGroupFindFirstArgs,
  ): Promise<UnitOnGroup> {
    try {
      return await this.prisma.unitOnGroup.findFirst(request);
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
    request: Prisma.UnitOnGroupFindUniqueArgs,
  ): Promise<UnitOnGroup> {
    try {
      return await this.prisma.unitOnGroup.findUnique(request);
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
    request: Prisma.UnitOnGroupFindManyArgs,
  ): Promise<UnitOnGroup[]> {
    try {
      return await this.prisma.unitOnGroup.findMany(request);
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

  async create(request: Prisma.UnitOnGroupCreateArgs): Promise<UnitOnGroup> {
    try {
      return await this.prisma.unitOnGroup.create(request);
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

  async update(request: Prisma.UnitOnGroupUpdateArgs): Promise<UnitOnGroup> {
    try {
      return await this.prisma.unitOnGroup.update(request);
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

  async delete(request: { unitOnGroupId: string }): Promise<UnitOnGroup> {
    try {
      await this.prisma.studentOnGroup.deleteMany({
        where: {
          unitOnGroupId: request.unitOnGroupId,
        },
      });

      return await this.prisma.unitOnGroup.delete({
        where: {
          id: request.unitOnGroupId,
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
