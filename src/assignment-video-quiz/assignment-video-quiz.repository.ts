import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, QuestionOnVideo } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/cache.service';
import { subjectIdsOf, subjectScope } from '../cache/cache-scopes';

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
    private cache: CacheService,
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
      await this.cache.bump(subjectScope(result.subjectId, 'assignments'));

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
      await this.cache.bump(subjectScope(result.subjectId, 'assignments'));

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

      const scopes = subjectIdsOf(args.data).map((id) =>
        subjectScope(id, 'assignments'),
      );
      if (scopes.length > 0) await this.cache.bump(...scopes);

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
      await this.cache.bump(subjectScope(result.subjectId, 'assignments'));

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
}
