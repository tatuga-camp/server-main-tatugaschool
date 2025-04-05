import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma, Feedback } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findMany(request: Prisma.FeedbackFindManyArgs): Promise<Feedback[]>;
  findUnique(request: Prisma.FeedbackFindUniqueArgs): Promise<Feedback | null>;
  create(request: Prisma.FeedbackCreateArgs): Promise<Feedback>;
  delete(request: Prisma.FeedbackDeleteArgs): Promise<Feedback>;
  count(request: Prisma.FeedbackCountArgs): Promise<number>;
};

@Injectable()
export class FeedbackRepository implements Repository {
  logger: Logger = new Logger(FeedbackRepository.name);
  
  constructor(private prisma: PrismaService) {}

  async count(request: Prisma.FeedbackCountArgs): Promise<number> {
    try {
      return this.prisma.feedback.count(request);
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

  async findMany(request: Prisma.FeedbackFindManyArgs): Promise<Feedback[]> {
    try {
      return await this.prisma.feedback.findMany(request);
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

  async findUnique(request: Prisma.FeedbackFindUniqueArgs): Promise<Feedback | null> {
    try {
      return await this.prisma.feedback.findUnique(request);
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

  async create(request: Prisma.FeedbackCreateArgs): Promise<Feedback> {
    try {
      return await this.prisma.feedback.create(request);
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

  async delete(request: Prisma.FeedbackDeleteArgs): Promise<Feedback> {
    try {
      return await this.prisma.feedback.delete(request);
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