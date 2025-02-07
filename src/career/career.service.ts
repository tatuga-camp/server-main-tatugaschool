import { SkillOnCareerRepository } from './../skill-on-career/skill-on-career.repository';
import { CareerRepository } from './career.repository';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Pagination } from '../interfaces';
import { Career, SkillOnCareer } from '@prisma/client';
import { CreateCareerDto, DeleteCareerDto, UpdateCareerDto } from './dto';
import { VectorService } from '../vector/vector.service';

@Injectable()
export class CareerService {
  private logger: Logger = new Logger(CareerService.name);
  careerRepository: CareerRepository = new CareerRepository(this.prisma);
  private skillOnCareerRepository: SkillOnCareerRepository =
    new SkillOnCareerRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private vectorService: VectorService,
  ) {}

  async getOne(dto: {
    careerId: string;
  }): Promise<Career & { skills: SkillOnCareer[] }> {
    try {
      const career = await this.careerRepository.findUnique({
        where: {
          id: dto.careerId,
        },
      });

      const skilss = await this.skillOnCareerRepository.findMany({
        where: {
          careerId: dto.careerId,
        },
      });

      return { ...career, skills: skilss };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateCareerDto): Promise<Career> {
    try {
      return await this.careerRepository.create({
        data: {
          ...dto,
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
