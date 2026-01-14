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
};
@Injectable()
export class FileAssignmentRepository implements Repository {
  logger: Logger = new Logger(FileAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

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
      return await this.prisma.fileOnAssignment.create({
        data: request,
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

      return fileOnAssignment;
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
