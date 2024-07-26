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
import { FileOnAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type FileAssignmentRepositoryType = {
  getById(request: RequestGetFileById): Promise<FileOnAssignment>;
  getByAssignmentId(
    request: RequestGetFilesByAssignmentId,
  ): Promise<FileOnAssignment[]>;
  create(request: RequestCreateFileAssignment): Promise<FileOnAssignment>;
  delete(request: RequestDeleteFileAssignment): Promise<{ message: string }>;
};
@Injectable()
export class FileAssignmentRepository implements FileAssignmentRepositoryType {
  logger: Logger = new Logger(FileAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

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
}
