import { CareerRepository } from './career.repository';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pagination } from '../interfaces';
import { Career } from '@prisma/client';
import {
  CreateCareerDto,
  DeleteCareerDto,
  GetCareerByPageDto,
  UpdateCareerDto,
} from './dto';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class CareerService {
  private logger: Logger = new Logger(CareerService.name);
  careerRepository: CareerRepository = new CareerRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
  ) {}

  async getCareerByPage(dto: GetCareerByPageDto): Promise<Pagination<Career>> {
    try {
      const numbers = await this.careerRepository.counts({});
      const totalPages = Math.ceil(numbers / dto.limit);

      if (dto.page > totalPages) {
        return {
          data: [],
          meta: {
            total: 1,
            lastPage: 1,
            currentPage: 1,
            prev: 1,
            next: 1,
          },
        };
      }

      const skip = (dto.page - 1) * dto.limit;

      const careers = await this.careerRepository.findMany({
        skip,
        take: dto.limit,
      });

      return {
        data: careers,
        meta: {
          total: totalPages,
          lastPage: totalPages,
          currentPage: dto.page,
          prev: dto.page - 1 < 0 ? dto.page : dto.page - 1,
          next: dto.page + 1 > totalPages ? dto.page : dto.page + 1,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateCareerDto): Promise<Career> {
    try {
      const text = `
      title: ${dto.title} 
      description: ${dto.description} 
      keywords: ${dto.keywords}`;
      const vector = await this.vectorService.embbedingText(text);

      return await this.careerRepository.create({
        data: {
          ...dto,
          vector: vector.predictions[0].embeddings.values,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(dto: UpdateCareerDto): Promise<Career> {
    try {
      const text = `
        title: ${dto.body.title} 
        description: ${dto.body.description} 
        keywords: ${dto.body.keywords}`;
      const vector = await this.vectorService.embbedingText(text);

      return await this.careerRepository.update({
        where: {
          id: dto.query.id,
        },
        data: {
          ...dto.body,
          vector: vector.predictions[0].embeddings.values,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: DeleteCareerDto): Promise<{ message: string }> {
    try {
      await this.careerRepository.delete({
        where: { id: dto.id },
      });
      return { message: 'Career deleted successfully' };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
