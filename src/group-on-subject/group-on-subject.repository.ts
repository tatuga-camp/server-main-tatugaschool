import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GroupOnSubject, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

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
  create(request: Prisma.GroupOnSubjectCreateArgs): Promise<GroupOnSubject>;
  update(request: Prisma.GroupOnSubjectUpdateArgs): Promise<GroupOnSubject>;
  delete(request: { groupOnSubjectId: string }): Promise<GroupOnSubject>;
};
@Injectable()
export class GroupOnSubjectRepository implements Repository {
  private logger: Logger;
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {
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
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.groupOnSubject.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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

  async create(
    request: Prisma.GroupOnSubjectCreateArgs,
  ): Promise<GroupOnSubject> {
    try {
      const result = await this.prisma.groupOnSubject.create(request);
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

  async update(
    request: Prisma.GroupOnSubjectUpdateArgs,
  ): Promise<GroupOnSubject> {
    try {
      const result = await this.prisma.groupOnSubject.update(request);
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

      const result = await this.prisma.groupOnSubject.delete({
        where: {
          id: request.groupOnSubjectId,
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
    return `group_subject_subjectId:${subjectId}`;
  }
}
