import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Student } from '@prisma/client';

import {
  RequestCreateManyStudents,
  RequestCreateStudent,
  RequestDeleteStudent,
  RequestGetAllStudents,
  RequestGetStudent,
  RequestUpdateStudent,
} from './interface/student.interface';

import { Logger } from '@nestjs/common';

export type StudentRepositoryType = {
  create(request: RequestCreateStudent): Promise<Student>;
  createMany(request: RequestCreateManyStudents): Promise<Student[]>;
  update(request: RequestUpdateStudent): Promise<Student>;
  findById(request: RequestGetStudent): Promise<Student | null>;
  findAll(request: RequestGetAllStudents): Promise<Student[]>;
  delete(request: RequestDeleteStudent): Promise<Student>;
};

@Injectable()
export class StudentRepository implements StudentRepositoryType {
  logger = new Logger(StudentRepository.name);
  constructor(private prisma: PrismaService) {}
  async update(request: RequestUpdateStudent): Promise<Student> {
    return this.prisma.student.update({
      where: { id: request.studentId },
      data: request.data.body,
    });
  }

  async create(request: RequestCreateStudent): Promise<Student> {
    try {
      return this.prisma.student.create({
        data: {
          ...request.data,
        },
      });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async createMany(
    request: RequestCreateManyStudents,
  ): Promise<Student[] | any> {
    try {
      const createdStudents = await this.prisma.student.createMany({
        data: request.data.students,
      });
      return createdStudents;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async findById(request: RequestGetStudent): Promise<Student | null> {
    return this.prisma.student.findUnique({
      where: { id: request.studentId },
    });
  }

  async findAll(request: RequestGetAllStudents): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: { classId: request.classId },
    });
  }

  async delete(request: RequestDeleteStudent): Promise<Student> {
    return this.prisma.student.delete({
      where: { id: request.studentId },
    });
  }
}
