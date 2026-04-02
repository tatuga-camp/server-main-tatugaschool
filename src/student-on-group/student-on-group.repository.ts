import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, StudentOnGroup } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';

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
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {
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
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.studentOnGroup.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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
      const result = await this.prisma.studentOnGroup.create(request);
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }

      return result;
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
      const result = await this.prisma.studentOnGroup.update(request);
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
      const result = await this.prisma.studentOnGroup.delete(request);
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
      const result = await this.prisma.studentOnGroup.deleteMany(request);

      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        await this.redisService?.del(this.getCacheKey(subjectId));
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
