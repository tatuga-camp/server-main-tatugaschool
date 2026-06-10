import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, WordCloud, WordCloudSet } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WordCloudSetRepository {
  private logger = new Logger(WordCloudSetRepository.name);
  constructor(private prisma: PrismaService) {}

  private handle(error: unknown): never {
    this.logger.error(error);
    if (error instanceof PrismaClientKnownRequestError) {
      throw new InternalServerErrorException(
        `message: ${error.message} - codeError: ${error.code}`,
      );
    }
    throw error;
  }

  async create(request: Prisma.WordCloudSetCreateArgs): Promise<WordCloudSet> {
    try {
      return await this.prisma.wordCloudSet.create(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findMany(
    request: Prisma.WordCloudSetFindManyArgs,
  ): Promise<WordCloudSet[]> {
    try {
      return await this.prisma.wordCloudSet.findMany(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findUnique(
    request: Prisma.WordCloudSetFindUniqueArgs,
  ): Promise<WordCloudSet | null> {
    try {
      return await this.prisma.wordCloudSet.findUnique(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async update(request: Prisma.WordCloudSetUpdateArgs): Promise<WordCloudSet> {
    try {
      return await this.prisma.wordCloudSet.update(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findManyQuestions(
    request: Prisma.WordCloudFindManyArgs,
  ): Promise<WordCloud[]> {
    try {
      return await this.prisma.wordCloud.findMany(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async findUniqueQuestion(
    request: Prisma.WordCloudFindUniqueArgs,
  ): Promise<WordCloud | null> {
    try {
      return await this.prisma.wordCloud.findUnique(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async createQuestion(
    request: Prisma.WordCloudCreateArgs,
  ): Promise<WordCloud> {
    try {
      return await this.prisma.wordCloud.create(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async updateQuestion(
    request: Prisma.WordCloudUpdateArgs,
  ): Promise<WordCloud> {
    try {
      return await this.prisma.wordCloud.update(request);
    } catch (error) {
      this.handle(error);
    }
  }

  async updateManyQuestions(
    request: Prisma.WordCloudUpdateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      return await this.prisma.wordCloud.updateMany(request);
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

  async findManyAnswers(
    request: Prisma.WordCloudAnswerFindManyArgs,
  ): Promise<Prisma.WordCloudAnswerGetPayload<true>[]> {
    try {
      return await this.prisma.wordCloudAnswer.findMany(request);
    } catch (error) {
      this.handle(error);
    }
  }

  // Deletes a set: its questions' answers, then questions, then the set.
  async deleteSet(setId: string): Promise<WordCloudSet> {
    try {
      const questions = await this.prisma.wordCloud.findMany({
        where: { wordCloudSetId: setId },
        select: { id: true },
      });
      const ids = questions.map((q) => q.id);
      if (ids.length) {
        await this.prisma.wordCloudAnswer.deleteMany({
          where: { wordCloudId: { in: ids } },
        });
        await this.prisma.wordCloud.deleteMany({
          where: { id: { in: ids } },
        });
      }
      return await this.prisma.wordCloudSet.delete({ where: { id: setId } });
    } catch (error) {
      this.handle(error);
    }
  }

  // Deletes one question (and its answers) belonging to a set.
  async deleteQuestion(wordCloudId: string): Promise<WordCloud> {
    try {
      await this.prisma.wordCloudAnswer.deleteMany({
        where: { wordCloudId },
      });
      return await this.prisma.wordCloud.delete({ where: { id: wordCloudId } });
    } catch (error) {
      this.handle(error);
    }
  }
}
