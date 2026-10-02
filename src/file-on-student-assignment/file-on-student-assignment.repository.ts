import { StorageService } from '../storage/storage.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RequestDeleteFileOnStudentAssignment,
  RequestGetFileOnStudentAssignmentById,
  RequestGetFileOnStudentAssignmentByStudentOnAssignmentId,
} from './interfaces';
import { FileOnStudentAssignment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

type FileOnStudentAssignmentRepositoryType = {
  getById(
    request: RequestGetFileOnStudentAssignmentById,
  ): Promise<FileOnStudentAssignment>;
  create(
    request: Prisma.FileOnStudentAssignmentCreateArgs,
  ): Promise<FileOnStudentAssignment>;
  findMany(
    request: Prisma.FileOnStudentAssignmentFindManyArgs,
  ): Promise<FileOnStudentAssignment[]>;
  delete(
    request: RequestDeleteFileOnStudentAssignment,
  ): Promise<FileOnStudentAssignment>;
  update(
    request: Prisma.FileOnStudentAssignmentUpdateArgs,
  ): Promise<FileOnStudentAssignment>;
  deleteMany(
    request: Prisma.FileOnStudentAssignmentFindManyArgs,
  ): Promise<void>;
};
@Injectable()
export class FileOnStudentAssignmentRepository
  implements FileOnStudentAssignmentRepositoryType
{
  logger: Logger = new Logger(FileOnStudentAssignmentRepository.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private cache: CacheService,
  ) {}

  async update(
    request: Prisma.FileOnStudentAssignmentUpdateArgs,
  ): Promise<FileOnStudentAssignment> {
    try {
      const result = await this.prisma.fileOnStudentAssignment.update(request);
      await this.cache.bump(subjectScope(result.subjectId, 'submissions'));
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
    request: Prisma.FileOnStudentAssignmentFindManyArgs,
  ): Promise<FileOnStudentAssignment[]> {
    try {
      return await this.prisma.fileOnStudentAssignment.findMany(request);
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

  async getById(
    request: RequestGetFileOnStudentAssignmentById,
  ): Promise<FileOnStudentAssignment> {
    try {
      return await this.prisma.fileOnStudentAssignment.findUnique({
        where: {
          id: request.fileOnStudentAssignmentId,
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
    request: Prisma.FileOnStudentAssignmentCreateArgs,
  ): Promise<FileOnStudentAssignment> {
    try {
      const result = await this.prisma.fileOnStudentAssignment.create(request);
      await this.cache.bump(subjectScope(result.subjectId, 'submissions'));
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
    request: RequestDeleteFileOnStudentAssignment,
  ): Promise<FileOnStudentAssignment> {
    try {
      const fileOnStudentAssignment =
        await this.prisma.fileOnStudentAssignment.findUnique({
          where: {
            id: request.fileOnStudentAssignmentId,
          },
        });

      // Concurrent / duplicate delete: the record was already removed before we
      // got here. Treat as a benign 404 instead of dereferencing null (-> 500).
      if (!fileOnStudentAssignment) {
        throw new NotFoundException('File on student assignment not found');
      }

      if (
        fileOnStudentAssignment.contentType === 'FILE' &&
        fileOnStudentAssignment.type !== 'link-url'
      ) {
        await this.storageService.DeleteFileOnStorage({
          fileName: fileOnStudentAssignment.body,
        });
      }

      const remove = await this.prisma.fileOnStudentAssignment.delete({
        where: {
          id: request.fileOnStudentAssignmentId,
        },
      });

      const result = remove;
      await this.cache.bump(
        subjectScope(fileOnStudentAssignment.subjectId, 'submissions'),
      );

      return result;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        // P2025: the row was deleted concurrently between findUnique and
        // delete. This is benign (already gone), so surface it as a 404 rather
        // than a 500. Returning it as a 404 also stops the caller from
        // double-decrementing school storage for a file that was only deleted
        // once.
        if (error.code === 'P2025') {
          throw new NotFoundException('File on student assignment not found');
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async deleteMany(
    request: Prisma.FileOnStudentAssignmentFindManyArgs,
  ): Promise<void> {
    try {
      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany(request);

      const deleteFileResults = await Promise.allSettled(
        fileOnStudentAssignments
          .filter((f) => f.contentType === 'FILE')
          .map((fileOnStudentAssignment) =>
            this.storageService.DeleteFileOnStorage({
              fileName: fileOnStudentAssignment.body,
            }),
          ),
      );
      deleteFileResults.forEach((result) => {
        if (result.status === 'rejected') {
          this.logger.error('Failed to delete file on storage', result.reason);
        }
      });

      await Promise.all(
        fileOnStudentAssignments.map((f) =>
          this.prisma.fileOnStudentAssignment.delete({
            where: {
              id: f.id,
            },
          }),
        ),
      );
      if (fileOnStudentAssignments.length > 0) {
        await this.cache.bump(
          subjectScope(fileOnStudentAssignments[0].subjectId, 'submissions'),
        );
      }
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
