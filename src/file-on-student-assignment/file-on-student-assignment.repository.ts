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
    private googleStorageService: GoogleStorageService,
  ) {}

  async update(
    request: Prisma.FileOnStudentAssignmentUpdateArgs,
  ): Promise<FileOnStudentAssignment> {
    try {
      return await this.prisma.fileOnStudentAssignment.update(request);
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
      return await this.prisma.fileOnStudentAssignment.create(request);
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

      if (fileOnStudentAssignment.contentType === 'FILE') {
        await this.googleStorageService.DeleteFileOnStorage({
          fileName: fileOnStudentAssignment.body,
        });
      }

      const remove = await this.prisma.fileOnStudentAssignment.delete({
        where: {
          id: request.fileOnStudentAssignmentId,
        },
      });
      return remove;
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
            await this.googleStorageService.DeleteFileOnStorage({
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
}
