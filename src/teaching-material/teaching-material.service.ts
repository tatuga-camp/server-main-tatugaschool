import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  FileOnTeachingMaterial,
  Plan,
  TeachingMaterial,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './../auth/auth.service';
import { FileOnTeachingMaterialService } from './../file-on-teaching-material/file-on-teaching-material.service';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { AiService } from './../vector/ai.service';
import { TeachingMaterialRepository } from './teaching-material.repository';
import { Pagination } from '../interfaces';

@Injectable()
export class TeachingMaterialService {
  private logger: Logger;
  teachingMaterialRepository: TeachingMaterialRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private aiService: AiService,
    private authService: AuthService,
    @Inject(forwardRef(() => FileOnTeachingMaterialService))
    private fileOnTeachingMaterialService: FileOnTeachingMaterialService,
  ) {
    this.logger = new Logger(TeachingMaterialService.name);
    this.teachingMaterialRepository = new TeachingMaterialRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async CursorBasedPagination(dto: {
    cursor: string;
    take: number;
    search?: string;
  }): Promise<(TeachingMaterial & { files: FileOnTeachingMaterial[] })[]> {
    try {
      const teachingMaterials = await this.teachingMaterialRepository.findMany({
        take: dto.take,
        ...(dto.cursor && {
          cursor: {
            id: dto.cursor,
          },
        }),
        orderBy: {
          id: 'asc',
        },
      });

      const files =
        await this.fileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany(
          {
            where: {
              OR: teachingMaterials.map((t) => {
                return {
                  teachingMaterialId: t.id,
                };
              }),
            },
          },
        );

      return teachingMaterials.map((t) => {
        return {
          ...t,
          files: files.filter((file) => file.teachingMaterialId === t.id),
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findByAI(dto: {
    search: string;
  }): Promise<(TeachingMaterial & { files: FileOnTeachingMaterial[] })[]> {
    try {
      const accessToken = await this.authService.getGoogleAccessToken();
      const translated = await this.aiService.translateText(
        dto.search,
        'en',
        accessToken,
      );

      const vector = await this.aiService.embbedingText(
        translated,
        accessToken,
      );

      const teachingMaterials =
        await this.teachingMaterialRepository.findByVector({
          vector: vector.predictions[0].embeddings.values,
        });

      const files =
        await this.fileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany(
          {
            where: {
              OR: teachingMaterials.map((t) => {
                return {
                  teachingMaterialId: t.id,
                };
              }),
            },
          },
        );
      return teachingMaterials.map((t) => {
        return {
          ...t,
          files: files.filter((file) => file.teachingMaterialId === t.id),
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async suggestionVectorResouce(dto: {
    data: { url: string; type: string }[];
  }): Promise<{
    description: string;
  }> {
    try {
      const accessToken = await this.authService.getGoogleAccessToken();
      const vectorResouce = await this.aiService.summarizeFile({
        imageURLs: dto.data.map((i) => {
          return {
            url: i.url,
            type: i.type,
          };
        }),
        accessToken,
      });
      return { description: vectorResouce.candidates[0].content.parts[0].text };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    dto: {
      title: string;
      description: string;
      tags: string[];
      accessLevel: Plan;
    },
    user: User,
  ): Promise<TeachingMaterial> {
    try {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('Only Admin can access');
      }

      const accessToken = await this.authService.getGoogleAccessToken();
      let text: string = '';
      text += dto.title;
      text += dto.description;
      dto.tags.forEach((tag) => (text += tag));

      const vector = await this.aiService.embbedingText(text, accessToken);
      const create = await this.teachingMaterialRepository.create({
        data: {
          ...dto,
          vector: vector.predictions[0].embeddings.values,
        },
      });
      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: {
      query: { id: string };
      body: {
        title?: string;
        description?: string;
        tags?: string[];
        accessLevel?: Plan;
      };
    },
    user: User,
  ): Promise<TeachingMaterial> {
    try {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('Only Admin can access');
      }
      const accessToken = await this.authService.getGoogleAccessToken();
      let text: string = '';
      text += dto.body?.title;
      text += dto.body?.description;
      dto.body?.tags.forEach((tag) => (text += tag));

      const vector = await this.aiService.embbedingText(text, accessToken);
      const create = await this.teachingMaterialRepository.update({
        where: {
          id: dto.query.id,
        },
        data: {
          ...dto.body,
          vector: vector.predictions[0].embeddings.values,
        },
      });
      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
