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
import { RedisService } from '../redis/redis.service';

type Repository = {
  getById(request: RequestGetFileById): Promise<FileOnAssignment>;
  getByAssignmentId(
    request: RequestGetFilesByAssignmentId,
  ): Promise<FileOnAssignment[]>;
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
    private redisService?: RedisService,
  ) {}

  async update(
    request: Prisma.FileOnAssignmentUpdateArgs,
  ): Promise<FileOnAssignment> {
    try {
      const result = await this.prisma.fileOnAssignment.update(request);
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        } else if (result.subjectId) {
          await this.redisService?.del(this.getCacheKey(result.subjectId));
        }
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
    request: Prisma.FileOnAssignmentFindManyArgs,
  ): Promise<FileOnAssignment[]> {
    try {
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.fileOnAssignment.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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

  async getByAssignmentId(
    request: RequestGetFilesByAssignmentId,
  ): Promise<FileOnAssignment[]> {
    try {
      return await this.prisma.fileOnAssignment.findMany({
        where: {
          assignmentId: request.assignmentId,
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
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        } else if (result.subjectId) {
          await this.redisService?.del(this.getCacheKey(result.subjectId));
        }
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
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        } else if (result.subjectId) {
          await this.redisService?.del(this.getCacheKey(result.subjectId));
        }
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

      const result = filesOnAssignments;

      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        }
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

  private getCacheKey(subjectId: string): string {
    return `file_assignment_subjectId:${subjectId}`;
  }
}
