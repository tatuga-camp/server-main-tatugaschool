import { Injectable } from '@nestjs/common';
import { School } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestCreateSchool } from './interfaces';

export type SchoolRepositoryType = {
  create: (request: RequestCreateSchool) => Promise<School>;
  update: (id: string, dto: any) => Promise<School>;
  delete: (id: string) => Promise<School>;
  getSchoolById: (id: string) => Promise<School>;
};

@Injectable()
export class SchoolRepository implements SchoolRepositoryType {
  constructor(private prisma: PrismaService) {}
  async create(request: RequestCreateSchool): Promise<School> {
    return this.prisma.school.create({
      data: {
        ...request,
      },
    });
  }
  async update(id: string, dto: any): Promise<School> {
    return this.prisma.school.update({
      where: {
        id,
      },
      data: {
        ...dto,
      },
    });
  }
  async delete(id: string): Promise<School> {
    return this.prisma.school.delete({
      where: {
        id,
      },
    });
  }
  async getSchoolById(id: string): Promise<School> {
    return this.prisma.school.findUnique({
      where: {
        id,
      },
    });
  }
}
