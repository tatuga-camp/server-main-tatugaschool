import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RequestCreateFileOnStudentAssignment,
  RequestDeleteFileOnStudentAssignment,
  RequestGetFileOnStudentAssignmentById,
  RequestGetFileOnStudentAssignmentByStudentOnAssignmentId,
} from './interfaces';
import { FileOnStudentAssignment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type FileOnStudentAssignmentRepositoryType = {
  getById(
    request: RequestGetFileOnStudentAssignmentById,
  ): Promise<FileOnStudentAssignment>;
  getByStudentOnAssignmentId(
    request: RequestGetFileOnStudentAssignmentByStudentOnAssignmentId,
  ): Promise<FileOnStudentAssignment[]>;
  create(
    request: RequestCreateFileOnStudentAssignment,
  ): Promise<FileOnStudentAssignment>;
  findMany(
    request: Prisma.FileOnStudentAssignmentFindManyArgs,
  ): Promise<FileOnStudentAssignment[]>;
  delete(
    request: RequestDeleteFileOnStudentAssignment,
  ): Promise<{ message: string }>;
  deleteByAssignmentId(request: {
    assignmentId: string;
  }): Promise<{ message: string }>;
};
@Injectable()
export class FileOnStudentAssignmentRepository
  implements FileOnStudentAssignmentRepositoryType
{
  logger: Logger = new Logger(FileOnStudentAssignmentRepository.name);

  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

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
    request: RequestCreateFileOnStudentAssignment,
  ): Promise<FileOnStudentAssignment> {
    try {
      return await this.prisma.fileOnStudentAssignment.create({
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
    request: RequestDeleteFileOnStudentAssignment,
  ): Promise<{ message: string }> {
    try {
      const fileOnStudentAssignment =
        await this.prisma.fileOnStudentAssignment.findUnique({
          where: {
            id: request.fileOnStudentAssignmentId,
          },
        });
      await this.googleStorageService.DeleteFileOnStorage({
        fileName: fileOnStudentAssignment.url,
      });

      await this.prisma.fileOnStudentAssignment.delete({
        where: {
          id: request.fileOnStudentAssignmentId,
        },
      });
      return { message: 'FileOnStudentAssignment deleted successfully' };
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
      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany({
          where: {
            assignmentId: request.assignmentId,
          },
        });

      await this.prisma.fileOnStudentAssignment.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      await Promise.all(
        fileOnStudentAssignments.map(async (fileOnStudentAssignment) => {
          await this.googleStorageService.DeleteFileOnStorage({
            fileName: fileOnStudentAssignment.url,
          });
        }),
      );

      return { message: 'FileOnStudentAssignment deleted successfully' };
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
