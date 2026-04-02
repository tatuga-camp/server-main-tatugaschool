import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, UnitOnGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';

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
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {
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
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.unitOnGroup.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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
      const result = await this.prisma.unitOnGroup.create(request);
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

  async update(request: Prisma.UnitOnGroupUpdateArgs): Promise<UnitOnGroup> {
    try {
      const result = await this.prisma.unitOnGroup.update(request);
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

  async delete(request: { unitOnGroupId: string }): Promise<UnitOnGroup> {
    try {
      await this.prisma.studentOnGroup.deleteMany({
        where: {
          unitOnGroupId: request.unitOnGroupId,
        },
      });

      const result = await this.prisma.unitOnGroup.delete({
        where: {
          id: request.unitOnGroupId,
        },
      });
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
    return `unit_group_subjectId:${subjectId}`;
  }
}
