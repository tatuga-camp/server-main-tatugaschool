import { StorageService } from '../storage/storage.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RequestCreateFileAssignment,
  RequestDeleteFileAssignment,
  RequestGetFileById,
  RequestGetFilesByAssignmentId,
} from './interfaces';
import { FileOnAssignment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

type Repository = {
  getById(request: RequestGetFileById): Promise<FileOnAssignment>;
  create(request: RequestCreateFileAssignment): Promise<FileOnAssignment>;
  delete(request: RequestDeleteFileAssignment): Promise<FileOnAssignment>;
  deleteByAssignmentId(request: {
    assignmentId: string;
  }): Promise<FileOnAssignment[]>;
  findMany(
    request: Prisma.FileOnAssignmentFindManyArgs,
  ): Promise<FileOnAssignment[]>;
  update(request: Prisma.FileOnAssignmentUpdateArgs): Promise<FileOnAssignment>;
};
@Injectable()
export class FileAssignmentRepository implements Repository {
  logger: Logger = new Logger(FileAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private cache: CacheService,
  ) {}

  async update(
    request: Prisma.FileOnAssignmentUpdateArgs,
  ): Promise<FileOnAssignment> {
    try {
      const result = await this.prisma.fileOnAssignment.update(request);

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

  async findMany(
    request: Prisma.FileOnAssignmentFindManyArgs,
  ): Promise<FileOnAssignment[]> {
    try {
      return await this.prisma.fileOnAssignment.findMany(request);
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

  async getById(request: RequestGetFileById): Promise<FileOnAssignment> {
    try {
      return await this.prisma.fileOnAssignment.findUnique({
        where: {
          id: request.fileOnAssignmentId,
        },
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
    request: RequestCreateFileAssignment,
  ): Promise<FileOnAssignment> {
    try {
      const result = await this.prisma.fileOnAssignment.create({
        data: request,
      });
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

  async delete(
    request: RequestDeleteFileAssignment,
  ): Promise<FileOnAssignment> {
    try {
      const fileOnAssignment = await this.prisma.fileOnAssignment.findUnique({
        where: {
          id: request.fileOnAssignmentId,
        },
      });

      if (!fileOnAssignment) {
        throw new NotFoundException('File not found');
      }

      await this.prisma.fileOnAssignment.delete({
        where: {
          id: request.fileOnAssignmentId,
        },
      });
      await this.cache.bump(
        subjectScope(fileOnAssignment.subjectId, 'assignments'),
      );

      if (fileOnAssignment.type === 'LINK') {
        return fileOnAssignment;
      }

      const checkExsit = await this.prisma.fileOnAssignment.findMany({
        where: {
          url: fileOnAssignment.url,
        },
      });

      if (checkExsit.length === 1) {
        await this.storageService.DeleteFileOnStorage({
          fileName: fileOnAssignment.url,
        });
      }

      const result = fileOnAssignment;
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

  async deleteByAssignmentId(request: {
    assignmentId: string;
  }): Promise<FileOnAssignment[]> {
    try {
      const filesOnAssignments = await this.prisma.fileOnAssignment.findMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      for (const file of filesOnAssignments.filter((f) => f.type !== 'LINK')) {
        const checkExsit = await this.prisma.fileOnAssignment.findMany({
          where: {
            url: file.url,
          },
        });
        if (checkExsit.length === 1) {
          await this.storageService.DeleteFileOnStorage({
            fileName: file.url,
          });
        }
      }

      await this.prisma.fileOnAssignment.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      if (filesOnAssignments.length > 0) {
        await this.cache.bump(
          subjectScope(filesOnAssignments[0].subjectId, 'assignments'),
        );
      }
      return filesOnAssignments;
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
