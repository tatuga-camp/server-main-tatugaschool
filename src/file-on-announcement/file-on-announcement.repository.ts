import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileOnAnnouncement, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findMany(
    request: Prisma.FileOnAnnouncementFindManyArgs,
  ): Promise<FileOnAnnouncement[]>;
};

@Injectable()
export class FileOnAnnouncementRepository implements Repository {
  logger: Logger = new Logger(FileOnAnnouncementRepository.name);
  constructor(private prisma: PrismaService) {}

  async findMany(
    request: Prisma.FileOnAnnouncementFindManyArgs,
  ): Promise<FileOnAnnouncement[]> {
    try {
      return await this.prisma.fileOnAnnouncement.findMany(request);
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
