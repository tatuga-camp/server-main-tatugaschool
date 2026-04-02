import { StorageService } from '../storage/storage.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestDeleteFileOnStudentAssignment,
  RequestGetFileOnStudentAssignmentById,
  RequestGetFileOnStudentAssignmentByStudentOnAssignmentId,
} from './interfaces';
import { FileOnStudentAssignment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';

type FileOnStudentAssignmentRepositoryType = {
  getById(
    request: RequestGetFileOnStudentAssignmentById,
  ): Promise<FileOnStudentAssignment>;
  getByStudentOnAssignmentId(
    request: RequestGetFileOnStudentAssignmentByStudentOnAssignmentId,
  ): Promise<FileOnStudentAssignment[]>;
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
    private redisService?: RedisService,
  ) {}

  async update(
    request: Prisma.FileOnStudentAssignmentUpdateArgs,
  ): Promise<FileOnStudentAssignment> {
    try {
      const result = await this.prisma.fileOnStudentAssignment.update(request);
      if (result && result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }
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
      const subjectId = request.where?.subjectId;

      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result =
          await this.prisma.fileOnStudentAssignment.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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

  async getByStudentOnAssignmentId(
    request: RequestGetFileOnStudentAssignmentByStudentOnAssignmentId,
  ): Promise<FileOnStudentAssignment[]> {
    try {
      return await this.prisma.fileOnStudentAssignment.findMany({
        where: {
          studentOnAssignmentId: request.studentOnAssignmentId,
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
      if (result && result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }
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
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }

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

  async deleteMany(
    request: Prisma.FileOnStudentAssignmentFindManyArgs,
  ): Promise<void> {
    try {
      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany(request);

      Promise.allSettled(
        fileOnStudentAssignments
          .filter((f) => f.contentType === 'FILE')
          .map(async (fileOnStudentAssignment) => {
            await this.storageService.DeleteFileOnStorage({
              fileName: fileOnStudentAssignment.body,
            });
          }),
      );

      await Promise.all(
        fileOnStudentAssignments.map((f) =>
          this.prisma.fileOnStudentAssignment.delete({
            where: {
              id: f.id,
            },
          }),
        ),
      );
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

  private getCacheKey(subjectId: string): string {
    return `subjectId:${subjectId}`;
  }
}
