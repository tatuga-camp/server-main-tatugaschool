import { Injectable, Logger } from '@nestjs/common';
import { School } from '@prisma/client';
import { CreateSchoolDto, UpdateSchoolDto } from './dto';
import { SchoolRepository, SchoolRepositoryType } from './school.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SchoolService {
  logger: Logger = new Logger(SchoolService.name);
  schoolRepository: SchoolRepositoryType;
  constructor(private prisma: PrismaService) {
    this.schoolRepository = new SchoolRepository(prisma);
  }

  async createSchool(dto: CreateSchoolDto): Promise<School> {
    try {
      return await this.schoolRepository.create(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async updateSchool(id: string, dto: UpdateSchoolDto): Promise<School> {
    try {
      return await this.schoolRepository.update(id, dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async deleteSchool(id: string): Promise<School> {
    try {
      return await this.schoolRepository.delete(id);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
  async getSchoolById(id: string): Promise<School> {
    try {
      return await this.schoolRepository.getSchoolById(id);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
