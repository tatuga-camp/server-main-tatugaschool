import { TeachingMaterialService } from './../teaching-material/teaching-material.service';
import { FileOnTeachingMaterialRepository } from './file-on-teaching-material.repository';
import { StorageService } from '../storage/storage.service';
import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileOnTeachingMaterial, User } from '@prisma/client';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { UserRepository } from '../users/users.repository';

@Injectable()
export class FileOnTeachingMaterialService {
  private logger: Logger;
  public fileOnTeachingMaterialRepository: FileOnTeachingMaterialRepository;
  private userRepository: UserRepository;
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @Inject(forwardRef(() => TeachingMaterialService))
    private teachingMaterialService: TeachingMaterialService,
  ) {
    this.logger = new Logger(FileOnTeachingMaterialService.name);
    this.fileOnTeachingMaterialRepository =
      new FileOnTeachingMaterialRepository(this.prisma, this.storageService);
    this.userRepository = new UserRepository(this.prisma);
  }

  async create(
    dto: {
      teachingMaterialId: string;
      url: string;
      size: number;
      type: string;
    },
    user: UserJwtPayload,
  ): Promise<FileOnTeachingMaterial> {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });

      if (!userInfo) {
        throw new NotFoundException('User not found');
      }
      if (userInfo.role !== 'ADMIN') {
        throw new ForbiddenException('Only Admin Is Allow');
      }
      const teachingMaterial =
        await this.teachingMaterialService.teachingMaterialRepository.findUnique(
          {
            where: {
              id: dto.teachingMaterialId,
            },
          },
        );

      if (!teachingMaterial) {
        throw new NotFoundException('TeachingMaterialId is invaild');
      }

      return await this.fileOnTeachingMaterialRepository.create({
        data: {
          ...dto,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: {
      fileOnTeachingMaterialId: string;
    },
    user: UserJwtPayload,
  ): Promise<FileOnTeachingMaterial> {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });
      if (!userInfo) {
        throw new NotFoundException('User not found');
      }
      if (userInfo.role !== 'ADMIN') {
        throw new ForbiddenException('Only Admin Is Allow');
      }
      return await this.fileOnTeachingMaterialRepository.delete({
        id: dto.fileOnTeachingMaterialId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
