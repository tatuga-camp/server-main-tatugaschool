import { GoogleStorageService } from './../google-storage/google-storage.service';
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
  delete(request: RequestDeleteFileAssignment): Promise<{ message: string }>;
  deleteByAssignmentId(request: {
    assignmentId: string;
  }): Promise<{ message: string }>;
  findMany(
    request: Prisma.FileOnAssignmentFindManyArgs,
  ): Promise<FileOnAssignment[]>;
};
@Injectable()
export class FileAssignmentRepository implements Repository {
  logger: Logger = new Logger(FileAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
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
  ): Promise<{ message: string }> {
    try {
      const fileOnAssignment = await this.prisma.fileOnAssignment.findUnique({
        where: {
          id: request.fileOnAssignmentId,
        },
      });

      if (!fileOnAssignment) {
        throw new NotFoundException('File not found');
      }

      await this.googleStorageService.DeleteFileOnStorage({
        fileName: fileOnAssignment.url,
      });

      await this.prisma.fileOnAssignment.delete({
        where: {
          id: request.fileOnAssignmentId,
        },
      });

      return { message: 'File deleted' };
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
  }): Promise<{ message: string }> {
    try {
      const filesOnAssignment = await this.prisma.fileOnAssignment.findMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      await this.prisma.fileOnAssignment.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      await Promise.all(
        filesOnAssignment.map(async (file) => {
          await this.googleStorageService.DeleteFileOnStorage({
            fileName: file.url,
          });
        }),
      );

      return { message: 'Files deleted' };
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
