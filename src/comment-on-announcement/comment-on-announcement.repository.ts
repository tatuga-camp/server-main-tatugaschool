import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CommentOnAnnouncement, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findMany(
    request: Prisma.CommentOnAnnouncementFindManyArgs,
  ): Promise<CommentOnAnnouncement[]>;
  findById(request: {
    commentOnAnnouncementId: string;
  }): Promise<CommentOnAnnouncement | null>;
  create(
    request: Prisma.CommentOnAnnouncementCreateArgs,
  ): Promise<CommentOnAnnouncement>;
  update(
    request: Prisma.CommentOnAnnouncementUpdateArgs,
  ): Promise<CommentOnAnnouncement>;
  delete(request: {
    commentOnAnnouncementId: string;
  }): Promise<CommentOnAnnouncement>;
};

@Injectable()
export class CommentOnAnnouncementRepository implements Repository {
  logger: Logger = new Logger(CommentOnAnnouncementRepository.name);
  constructor(private prisma: PrismaService) {}

  async findMany(
    request: Prisma.CommentOnAnnouncementFindManyArgs,
  ): Promise<CommentOnAnnouncement[]> {
    try {
      return await this.prisma.commentOnAnnouncement.findMany(request);
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

  async findById(request: {
    commentOnAnnouncementId: string;
  }): Promise<CommentOnAnnouncement | null> {
    try {
      return await this.prisma.commentOnAnnouncement.findUnique({
        where: { id: request.commentOnAnnouncementId },
      });
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
    request: Prisma.CommentOnAnnouncementCreateArgs,
  ): Promise<CommentOnAnnouncement> {
    try {
      return await this.prisma.commentOnAnnouncement.create(request);
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
    request: Prisma.CommentOnAnnouncementUpdateArgs,
  ): Promise<CommentOnAnnouncement> {
    try {
      return await this.prisma.commentOnAnnouncement.update(request);
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

  async delete(request: {
    commentOnAnnouncementId: string;
  }): Promise<CommentOnAnnouncement> {
    try {
      return await this.prisma.commentOnAnnouncement.delete({
        where: { id: request.commentOnAnnouncementId },
      });
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
