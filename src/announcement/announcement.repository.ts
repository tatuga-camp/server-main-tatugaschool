import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Announcement, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findMany(request: Prisma.AnnouncementFindManyArgs): Promise<Announcement[]>;
  findById(request: { announcementId: string }): Promise<Announcement | null>;
  create(request: Prisma.AnnouncementCreateArgs): Promise<Announcement>;
  update(request: Prisma.AnnouncementUpdateArgs): Promise<Announcement>;
  delete(request: { announcementId: string }): Promise<Announcement>;
};

@Injectable()
export class AnnouncementRepository implements Repository {
  logger: Logger = new Logger(AnnouncementRepository.name);
  constructor(private prisma: PrismaService) {}

  async findMany(
    request: Prisma.AnnouncementFindManyArgs,
  ): Promise<Announcement[]> {
    try {
      return await this.prisma.announcement.findMany(request);
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
    announcementId: string;
  }): Promise<Announcement | null> {
    try {
      return await this.prisma.announcement.findUnique({
        where: { id: request.announcementId },
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

  async create(request: Prisma.AnnouncementCreateArgs): Promise<Announcement> {
    try {
      return await this.prisma.announcement.create(request);
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

  async update(request: Prisma.AnnouncementUpdateArgs): Promise<Announcement> {
    try {
      return await this.prisma.announcement.update(request);
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

  async delete(request: { announcementId: string }): Promise<Announcement> {
    try {
      return await this.prisma.announcement.delete({
        where: { id: request.announcementId },
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
