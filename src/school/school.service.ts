import { Injectable, Logger } from '@nestjs/common';
import { MemberRole, School, Status } from '@prisma/client';
import { CreateSchoolDto, UpdateSchoolDto } from './dto';
import { SchoolRepository, SchoolRepositoryType } from './school.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  MemberOnSchoolRepository,
  MemberOnSchoolRepositoryType,
} from 'src/member-on-school/member-on-school.repository';

@Injectable()
export class SchoolService {
  logger: Logger = new Logger(SchoolService.name);
  schoolRepository: SchoolRepositoryType;
  memberOnSchoolRepository: MemberOnSchoolRepositoryType;
  constructor(private prisma: PrismaService) {
    this.schoolRepository = new SchoolRepository(prisma);
    this.memberOnSchoolRepository = new MemberOnSchoolRepository(prisma);
  }

  async getSchools(page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;
      const [schools, total] = await Promise.all([
        this.prisma.school.findMany({
          skip,
          take: limit,
        }),
        this.prisma.school.count(),
      ]);

      return {
        data: schools,
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSchool(user, dto: CreateSchoolDto): Promise<School> {
    try {
      const school = await this.schoolRepository.create(dto);
      await this.memberOnSchoolRepository.create({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        phone: user.phone,
        userId: user.id,
        role: MemberRole.ADMIN,
        status: Status.ACCEPT,
        schoolId: school.id,
      });
      return school;
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
