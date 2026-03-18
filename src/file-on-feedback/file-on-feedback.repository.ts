import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, FileOnFeedback } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findMany(
    request: Prisma.FileOnFeedbackFindManyArgs,
  ): Promise<FileOnFeedback[]>;
  findUnique(
    request: Prisma.FileOnFeedbackFindUniqueArgs,
  ): Promise<FileOnFeedback | null>;
  create(request: Prisma.FileOnFeedbackCreateArgs): Promise<FileOnFeedback>;
  delete(request: Prisma.FileOnFeedbackDeleteArgs): Promise<FileOnFeedback>;
  count(request: Prisma.FileOnFeedbackCountArgs): Promise<number>;
};

@Injectable()
export class FileOnFeedbackRepository implements Repository {
  logger: Logger = new Logger(FileOnFeedbackRepository.name);

  constructor(private prisma: PrismaService) {}

  async count(request: Prisma.FileOnFeedbackCountArgs): Promise<number> {
    try {
      return await this.prisma.fileOnFeedback.count(request);
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
    request: Prisma.FileOnFeedbackFindManyArgs,
  ): Promise<FileOnFeedback[]> {
    try {
      return await this.prisma.fileOnFeedback.findMany(request);
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
    request: Prisma.FileOnFeedbackFindUniqueArgs,
  ): Promise<FileOnFeedback | null> {
    try {
      return await this.prisma.fileOnFeedback.findUnique(request);
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
    request: Prisma.FileOnFeedbackCreateArgs,
  ): Promise<FileOnFeedback> {
    try {
      return await this.prisma.fileOnFeedback.create(request);
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
    request: Prisma.FileOnFeedbackDeleteArgs,
  ): Promise<FileOnFeedback> {
    try {
      return await this.prisma.fileOnFeedback.delete(request);
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
