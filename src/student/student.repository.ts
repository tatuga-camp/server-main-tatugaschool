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
    try {
      return this.prisma.student.update({
        where: { id: request.studentId },
        data: request.data.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
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
      console.log('Students created successfully:', createdStudents);
      return createdStudents;
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async findById(request: RequestGetStudent): Promise<Student | null> {
    try {
      return this.prisma.student.findUnique({
        where: { id: request.studentId },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findAll(request: RequestGetAllStudents): Promise<Student[]> {
    try {
      return this.prisma.student.findMany({
        where: { classId: request.classId },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(request: RequestDeleteStudent): Promise<Student> {
    try {
      return this.prisma.student.delete({
        where: { id: request.studentId },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
