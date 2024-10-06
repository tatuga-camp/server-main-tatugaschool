import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Student } from '@prisma/client';

import {
  RequestCreateManyStudents,
  RequestCreateStudent,
  RequestDeleteStudent,
  RequestGetAllStudents,
  RequestGetStudent,
  RequestUpdateStudent,
} from './interface/request-student.interface';

import { Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type StudentRepositoryType = {
  create(request: RequestCreateStudent): Promise<Student>;
  update(request: RequestUpdateStudent): Promise<Student>;
  findById(request: RequestGetStudent): Promise<Student | null>;
  findByClassId(request: RequestGetAllStudents): Promise<Student[]>;
  delete(request: RequestDeleteStudent): Promise<{ message: string }>;
};

@Injectable()
export class StudentRepository implements StudentRepositoryType {
  logger = new Logger(StudentRepository.name);
  constructor(private prisma: PrismaService) {}

  async update(request: RequestUpdateStudent): Promise<Student> {
    try {
      const student = await this.prisma.student.update({
        where: { id: request.query.studentId },
        data: request.body,
      });

      delete request.body.password;
      await Promise.allSettled([
        this.prisma.studentOnAssignment.updateMany({
          where: {
            studentId: student.id,
          },
          data: request.body,
        }),
        this.prisma.studentOnSubject.updateMany({
          where: {
            studentId: student.id,
          },
          data: request.body,
        }),
        this.prisma.commentOnAssignment.updateMany({
          where: {
            studentId: student.id,
          },
          data: request.body,
        }),
        this.prisma.scoreOnStudent.updateMany({
          where: {
            studentId: student.id,
          },
          data: request.body,
        }),
      ]);

      return student;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async create(request: RequestCreateStudent): Promise<Student> {
    try {
      return await this.prisma.student.create({
        data: {
          ...request,
        },
      });
    } catch (err) {
      this.logger.error(err);
      throw err;
    }
  }

  async findById(request: RequestGetStudent): Promise<Student | null> {
    try {
      return await this.prisma.student.findUnique({
        where: { id: request.studentId },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByClassId(request: RequestGetAllStudents): Promise<Student[]> {
    try {
      return await this.prisma.student.findMany({
        where: { classId: request.classId },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async delete(request: RequestDeleteStudent): Promise<{ message: string }> {
    try {
      await this.prisma.student.delete({
        where: { id: request.studentId },
      });
      return { message: 'Student deleted' };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
