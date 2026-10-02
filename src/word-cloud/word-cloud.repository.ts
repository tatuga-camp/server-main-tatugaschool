import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, WordCloud, WordCloudAnswer } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

export type Repository = {
  findMany(request: Prisma.WordCloudFindManyArgs): Promise<WordCloud[]>;
  findUnique(
    request: Prisma.WordCloudFindUniqueArgs,
  ): Promise<WordCloud | null>;
  create(request: Prisma.WordCloudCreateArgs): Promise<WordCloud>;
  update(request: Prisma.WordCloudUpdateArgs): Promise<WordCloud>;
  delete(request: { wordCloudId: string }): Promise<WordCloud>;
  findManyAnswers(
    request: Prisma.WordCloudAnswerFindManyArgs,
  ): Promise<WordCloudAnswer[]>;
  countAnswers(request: Prisma.WordCloudAnswerCountArgs): Promise<number>;
  createAnswer(
    request: Prisma.WordCloudAnswerCreateArgs,
  ): Promise<WordCloudAnswer>;
};

@Injectable()
export class WordCloudRepository implements Repository {
  private logger = new Logger(WordCloudRepository.name);
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private handle(error: unknown): never {
    this.logger.error(error);
    if (error instanceof PrismaClientKnownRequestError) {
      throw new InternalServerErrorException(
        `message: ${error.message} - codeError: ${error.code}`,
      );
    }
    throw error;
  }

  async findMany(
    request: Prisma.WordCloudFindManyArgs,
  ): Promise<WordCloud[]> {
    try {
      return await this.prisma.wordCloud.findMany(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findUnique(
    request: Prisma.WordCloudFindUniqueArgs,
  ): Promise<WordCloud | null> {
    try {
      return await this.prisma.wordCloud.findUnique(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async create(request: Prisma.WordCloudCreateArgs): Promise<WordCloud> {
    try {
      const result = await this.prisma.wordCloud.create(request);
      await this.cache.bump(subjectScope(result.subjectId, 'wordcloud'));
      return result;
    } catch (error) {
      this.handle(error);
    }
  }

  async update(request: Prisma.WordCloudUpdateArgs): Promise<WordCloud> {
    try {
      const result = await this.prisma.wordCloud.update(request);
      await this.cache.bump(subjectScope(result.subjectId, 'wordcloud'));
      return result;
    } catch (error) {
      this.handle(error);
    }
  }

  async delete(request: { wordCloudId: string }): Promise<WordCloud> {
    try {
      await this.prisma.wordCloudAnswer.deleteMany({
        where: { wordCloudId: request.wordCloudId },
      });
      const result = await this.prisma.wordCloud.delete({
        where: { id: request.wordCloudId },
      });
      await this.cache.bump(subjectScope(result.subjectId, 'wordcloud'));
      return result;
    } catch (error) {
      this.handle(error);
    }
  }

  async findManyAnswers(
    request: Prisma.WordCloudAnswerFindManyArgs,
  ): Promise<WordCloudAnswer[]> {
    try {
      return await this.prisma.wordCloudAnswer.findMany(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async countAnswers(
    request: Prisma.WordCloudAnswerCountArgs,
  ): Promise<number> {
    try {
      return await this.prisma.wordCloudAnswer.count(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async createAnswer(
    request: Prisma.WordCloudAnswerCreateArgs,
  ): Promise<WordCloudAnswer> {
    try {
      const result = await this.prisma.wordCloudAnswer.create(request);
      await this.cache.bump(subjectScope(result.subjectId, 'wordcloud'));
      return result;
    } catch (error) {
      this.handle(error);
    }
  }
}
