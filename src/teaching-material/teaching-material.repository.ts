import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { $Enums, Prisma, TeachingMaterial } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GoogleStorageService } from '../google-storage/google-storage.service';

type Repository = {
  findUnique(
    request: Prisma.TeachingMaterialFindUniqueArgs,
  ): Promise<TeachingMaterial>;
  findFirst(
    request: Prisma.TeachingMaterialFindFirstArgs,
  ): Promise<TeachingMaterial>;
  findMany(
    request: Prisma.TeachingMaterialFindManyArgs,
  ): Promise<TeachingMaterial[]>;
  findByVector(dto: { vector: number[] }): Promise<TeachingMaterial[]>;
  update(request: Prisma.TeachingMaterialUpdateArgs): Promise<TeachingMaterial>;
  create(request: Prisma.TeachingMaterialCreateArgs): Promise<TeachingMaterial>;
  delete(request: { id: string }): Promise<TeachingMaterial>;
};
@Injectable()
export class TeachingMaterialRepository implements Repository {
  private logger: Logger;

  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.logger = new Logger(TeachingMaterialRepository.name);
  }

  async findByVector(dto: { vector: number[] }): Promise<TeachingMaterial[]> {
    try {
      const teachingMaterialRaw =
        (await this.prisma.teachingMaterial.aggregateRaw({
          pipeline: [
            {
              $vectorSearch: {
                queryVector: dto.vector,
                path: 'vector',
                numCandidates: 768,
                limit: 500,
                index: 'teachingMaterialIndexing',
              },
            },
            {
              $addFields: { score: { $meta: 'vectorSearchScore' } },
            },
            {
              $match: { score: { $gte: 0.5 } },
            },
            {
              $project: {
                _id: 1,
                createAt: 1,
                updateAt: 1, // Add current timestamp
                title: 1,
                description: 1,
                tags: 1,
                accessLevel: 1,
                thumbnail: 1,
                blurHash: 1,
              },
            },
          ],
        })) as unknown as {
          _id: {
            $oid: string;
          };
          createAt: {
            $date: Date;
          };
          updateAt: {
            $date: Date;
          };
          title: string;
          description: string;
          thumbnail: string | null;
          tags: string[];
          accessLevel: $Enums.Plan;
          vector: number[];
        }[];
      const teachingMaterials = teachingMaterialRaw.map((teachingMaterial) => ({
        id: teachingMaterial._id.$oid,
        createAt: teachingMaterial.createAt.$date,
        updateAt: teachingMaterial.updateAt.$date,
        title: teachingMaterial.title as string,
        description: teachingMaterial.description as string,
        tags: teachingMaterial.tags as string[],
        accessLevel: teachingMaterial.accessLevel,
        thumbnail: teachingMaterial.thumbnail,
      })) as TeachingMaterial[];

      return teachingMaterials;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
    }
  }

  async findUnique(
    request: Prisma.TeachingMaterialFindUniqueArgs,
  ): Promise<TeachingMaterial> {
    try {
      return await this.prisma.teachingMaterial.findUnique(request);
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

  async findFirst(
    request: Prisma.TeachingMaterialFindFirstArgs,
  ): Promise<TeachingMaterial> {
    try {
      return await this.prisma.teachingMaterial.findFirst(request);
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
    request: Prisma.TeachingMaterialFindManyArgs,
  ): Promise<TeachingMaterial[]> {
    try {
      return await this.prisma.teachingMaterial.findMany(request);
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
    request: Prisma.TeachingMaterialUpdateArgs,
  ): Promise<TeachingMaterial> {
    try {
      return await this.prisma.teachingMaterial.update(request);
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
    request: Prisma.TeachingMaterialCreateArgs,
  ): Promise<TeachingMaterial> {
    try {
      return await this.prisma.teachingMaterial.create(request);
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

  async delete(request: { id: string }): Promise<TeachingMaterial> {
    try {
      const teachingMaterial = await this.prisma.teachingMaterial.delete({
        where: {
          id: request.id,
        },
      });

      return teachingMaterial;
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
