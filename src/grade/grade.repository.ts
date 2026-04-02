import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GradeRange, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';

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
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {
    this.logger = new Logger(GradeRepository.name);
  }
  async create(request: Prisma.GradeRangeCreateArgs): Promise<GradeRange> {
    try {
      const result = await this.prisma.gradeRange.create(request);
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        } else if (result.subjectId) {
          await this.redisService?.del(this.getCacheKey(result.subjectId));
        }
      }
      return result;
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
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.gradeRange.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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
      const result = await this.prisma.gradeRange.delete(request);
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
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

  async update(request: Prisma.GradeRangeUpdateArgs): Promise<GradeRange> {
    try {
      const result = await this.prisma.gradeRange.update(request);
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
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
    return `subjectId:${subjectId}`;
  }
}
