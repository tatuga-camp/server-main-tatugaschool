import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GradeRange, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findUnique(request: Prisma.GradeRangeFindUniqueArgs): Promise<GradeRange>;
  findMany(request: Prisma.GradeRangeFindManyArgs): Promise<GradeRange[]>;
  delete(request: Prisma.GradeRangeDeleteArgs): Promise<GradeRange>;
  update(request: Prisma.GradeRangeUpdateArgs): Promise<GradeRange>;
  create(request: Prisma.GradeRangeCreateArgs): Promise<GradeRange>;
};
@Injectable()
export class GradeRepository implements Repository {
  private logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(GradeRepository.name);
  }
  async create(request: Prisma.GradeRangeCreateArgs): Promise<GradeRange> {
    try {
      return await this.prisma.gradeRange.create(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'You already created grade range on your subject',
          );
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findUnique(
    request: Prisma.GradeRangeFindUniqueArgs,
  ): Promise<GradeRange> {
    try {
      return await this.prisma.gradeRange.findUnique(request);
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
    request: Prisma.GradeRangeFindManyArgs,
  ): Promise<GradeRange[]> {
    try {
      return await this.prisma.gradeRange.findMany(request);
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

  async delete(request: Prisma.GradeRangeDeleteArgs): Promise<GradeRange> {
    try {
      return await this.prisma.gradeRange.delete(request);
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

  async update(request: Prisma.GradeRangeUpdateArgs): Promise<GradeRange> {
    try {
      return await this.prisma.gradeRange.update(request);
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
