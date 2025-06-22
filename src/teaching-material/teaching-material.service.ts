import { HttpService } from '@nestjs/axios';
import { ImageService } from './../image/image.service';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
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
import * as crypto from 'crypto';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import * as cheerio from 'cheerio';

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
    private imageService: ImageService,
    private httpService: HttpService,
  ) {
    this.logger = new Logger(TeachingMaterialService.name);
    this.teachingMaterialRepository = new TeachingMaterialRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async get(
    dto: { teachingMaterialId: string },
    user: User,
  ): Promise<
    TeachingMaterial & {
      files: FileOnTeachingMaterial[];
      createor: { image: string; title: string; description: string };
    }
  > {
    try {
      const teachingMaterial = await this.teachingMaterialRepository.findUnique(
        {
          where: {
            id: dto.teachingMaterialId,
          },
        },
      );

      if (!teachingMaterial) {
        throw new NotFoundException('TeachingMaterial not found');
      }

      const files =
        await this.fileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany(
          {
            where: {
              teachingMaterialId: teachingMaterial.id,
            },
          },
        );

      const html = await this.getExternalUrlHtml(
        teachingMaterial.creatorURL,
      ).catch((reason) => {
        this.logger.error(reason);
      });

      if (!html) {
        return {
          ...teachingMaterial,
          files,
          createor: {
            title: 'ERROR',
            description: 'UNKNOW',
            image: '/favicon.ico',
          },
        };
      }
      const $ = cheerio.load(html);

      // 3. Create a helper function to extract meta tag content
      const getMetaTagContent = (property: string): string => {
        return $(`meta[property="${property}"]`).attr('content') || '';
      };

      const ogData = {
        title: getMetaTagContent('og:title'),
        description: getMetaTagContent('og:description'),
        image: getMetaTagContent('og:image'),
      };

      return { ...teachingMaterial, files, createor: ogData };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
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

  async findByAI(dto: { search: string }): Promise<TeachingMaterial[]> {
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

      return teachingMaterials;
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
      creatorURL: string;
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

  async createThumnail(
    dto: {
      teachingMaterialId: string;
    },
    user: User,
  ): Promise<TeachingMaterial> {
    try {
      if (user.role !== 'ADMIN') {
        throw new ForbiddenException('Only Admin is allowed');
      }
      const teachingMaterial = await this.teachingMaterialRepository.findUnique(
        {
          where: {
            id: dto.teachingMaterialId,
          },
        },
      );
      const files =
        await this.fileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany(
          {
            where: {
              teachingMaterialId: dto.teachingMaterialId,
            },
          },
        );

      const pdf = files.find((f) => f.type === 'application/pdf');
      const image = files.find((f) => f.type.includes('image'));

      if (pdf) {
        const buffer = await this.imageService.generatePdfThumbnail(pdf.url);
        const upload = await this.googleStorageService.uploadFile(
          `userId:${user.id}/thumnail/ID:${crypto.randomBytes(12).toString('hex')}.png`,
          buffer,
          'image/png',
        );

        const burhash = await this.imageService.encodeImageToBlurhash(upload);
        console.log(burhash);

        return await this.teachingMaterialRepository.update({
          where: {
            id: teachingMaterial.id,
          },
          data: {
            thumbnail: upload,
            blurHash: burhash,
          },
        });
      } else if (image) {
        const burhash = await this.imageService.encodeImageToBlurhash(
          image.url,
        );
        return await this.teachingMaterialRepository.update({
          where: {
            id: teachingMaterial.id,
          },
          data: {
            thumbnail: image.url,
            blurHash: burhash,
          },
        });
      }
      return teachingMaterial;
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
        creatorURL?: string;
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

  async getExternalUrlHtml(url: string): Promise<string> {
    if (!url) {
      throw new BadRequestException('URL is required');
    }

    try {
      // Use the HttpService to make a GET request
      const response = await firstValueFrom(this.httpService.get<string>(url));
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error fetching the URL:', axiosError.message);
      throw new InternalServerErrorException('Error fetching the external URL');
    }
  }
}
