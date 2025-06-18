import { GoogleStorageService } from './../google-storage/google-storage.service';
import { FileOnTeachingMaterial, Prisma } from '@prisma/client';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findMany(
    request: Prisma.FileOnTeachingMaterialFindManyArgs,
  ): Promise<FileOnTeachingMaterial[]>;
  create(
    request: Prisma.FileOnTeachingMaterialCreateArgs,
  ): Promise<FileOnTeachingMaterial>;
  update(
    request: Prisma.FileOnTeachingMaterialUpdateArgs,
  ): Promise<FileOnTeachingMaterial>;
  delete(request: { id: string }): Promise<FileOnTeachingMaterial>;
};
@Injectable()
export class FileOnTeachingMaterialRepository implements Repository {
  private logger: Logger;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.logger = new Logger(FileOnTeachingMaterialRepository.name);
  }

  async findMany(
    request: Prisma.FileOnTeachingMaterialFindManyArgs,
  ): Promise<FileOnTeachingMaterial[]> {
    try {
      return await this.prisma.fileOnTeachingMaterial.findMany(request);
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
    request: Prisma.FileOnTeachingMaterialCreateArgs,
  ): Promise<FileOnTeachingMaterial> {
    try {
      return await this.prisma.fileOnTeachingMaterial.create(request);
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

  async update(
    request: Prisma.FileOnTeachingMaterialUpdateArgs,
  ): Promise<FileOnTeachingMaterial> {
    try {
      return await this.prisma.fileOnTeachingMaterial.update(request);
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

  async delete(request: { id: string }): Promise<FileOnTeachingMaterial> {
    try {
      const remove = await this.prisma.fileOnTeachingMaterial.delete({
        where: {
          id: request.id,
        },
      });

      await this.googleStorageService.DeleteFileOnStorage({
        fileName: remove.url,
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
}
