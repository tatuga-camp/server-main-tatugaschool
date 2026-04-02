import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, QuestionOnVideo } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';

export type Repository = {
  findFirst(
    args: Prisma.QuestionOnVideoFindFirstArgs,
  ): Promise<QuestionOnVideo | null>;
  findUnique(
    args: Prisma.QuestionOnVideoFindUniqueArgs,
  ): Promise<QuestionOnVideo | null>;
  findMany(
    args: Prisma.QuestionOnVideoFindManyArgs,
  ): Promise<QuestionOnVideo[]>;
  update(args: Prisma.QuestionOnVideoUpdateArgs): Promise<QuestionOnVideo>;
  create(args: Prisma.QuestionOnVideoCreateArgs): Promise<QuestionOnVideo>;
  createMany(
    args: Prisma.QuestionOnVideoCreateManyArgs,
  ): Promise<Prisma.BatchPayload>;
  delete(args: Prisma.QuestionOnVideoDeleteArgs): Promise<QuestionOnVideo>;
};

@Injectable()
export class AssignmentVideoQuizRepository implements Repository {
  private logger = new Logger(AssignmentVideoQuizRepository.name);

  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {}

  async findFirst(
    args: Prisma.QuestionOnVideoFindFirstArgs,
  ): Promise<QuestionOnVideo | null> {
    try {
      return await this.prisma.questionOnVideo.findFirst(args);
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
    args: Prisma.QuestionOnVideoFindUniqueArgs,
  ): Promise<QuestionOnVideo | null> {
    try {
      return await this.prisma.questionOnVideo.findUnique(args);
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
    args: Prisma.QuestionOnVideoFindManyArgs,
  ): Promise<QuestionOnVideo[]> {
    try {
      const subjectId = args.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(args);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.questionOnVideo.findMany(args);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
      return await this.prisma.questionOnVideo.findMany(args);
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
    args: Prisma.QuestionOnVideoUpdateArgs,
  ): Promise<QuestionOnVideo> {
    try {
      const result = await this.prisma.questionOnVideo.update(args);
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

  async create(
    args: Prisma.QuestionOnVideoCreateArgs,
  ): Promise<QuestionOnVideo> {
    try {
      const result = await this.prisma.questionOnVideo.create(args);
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

  async createMany(
    args: Prisma.QuestionOnVideoCreateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      const result = await this.prisma.questionOnVideo.createMany(args);

      const subjectId = args.data[0]?.subjectId;
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

  async delete(
    args: Prisma.QuestionOnVideoDeleteArgs,
  ): Promise<QuestionOnVideo> {
    try {
      const result = await this.prisma.questionOnVideo.delete(args);
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
