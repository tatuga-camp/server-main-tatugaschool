import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Class } from '@prisma/client';
import {
  RequestCreateClass,
  RequestDeleteClass,
  RequestGetClass,
  RequestGetClassByPage,
  RequestReorderClass,
  RequestUpdateClass,
} from './interfaces/class.interface';

export type ClassRepositoryType = {
  create(request: RequestCreateClass): Promise<Class>;
  update(request: RequestUpdateClass): Promise<Class>;
  findById(request: RequestGetClass): Promise<Class | null>;
  findAll(): Promise<Class[]>;
  findWithPagination(
    request: RequestGetClassByPage,
  ): Promise<{ data: Class[]; total: number; page: number; limit: number }>;
  reorder(request: RequestReorderClass): Promise<Class[]>;
  delete(request: RequestDeleteClass): Promise<Class>;
};

@Injectable()
export class ClassRepository {
  constructor(private prisma: PrismaService) {}

  async create(request: RequestCreateClass) {
    const totalClass = await this.prisma.class.count({
      where: {
        schoolId: request.schoolId,
      },
    });
    return this.prisma.class.create({
      data: {
        ...request,
        order: totalClass || 1,
      },
    });
  }

  async update(request: RequestUpdateClass): Promise<Class> {
    return this.prisma.class.update({
      where: {
        id: request.query.classId,
      },
      data: {
        ...request.data,
      },
    });
  }

  async findById(request: RequestGetClass): Promise<Class | null> {
    return this.prisma.class.findUnique({
      where: { id: request.classId },
    });
  }

  async findAll(): Promise<Class[]> {
    return this.prisma.class.findMany();
  }

  async findWithPagination(
    request: RequestGetClassByPage,
  ): Promise<{ data: Class[]; total: number; page: number; limit: number }> {
    const { page, limit } = request;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        skip,
        take: limit,
      }),
      this.prisma.class.count(),
    ]);

    return { data, total, page, limit };
  }

  async reorder(request: RequestReorderClass): Promise<Class[]> {
    const { classIds } = request;
    const updatePromises = classIds.map((id, index) =>
      this.prisma.class.update({
        where: { id },
        data: { order: index },
      }),
    );

    return Promise.all(updatePromises);
  }

  async delete(request: RequestDeleteClass): Promise<Class> {
    return this.prisma.class.delete({
      where: { id: request.classId },
    });
  }
}
