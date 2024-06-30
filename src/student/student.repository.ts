import { ForbiddenException, Injectable } from '@nestjs/common';
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
      await this.validateSchool(request);

      await this.validateClass(request);

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

  private async validateClass(request: RequestCreateManyStudents) {
    const classIds = [
      ...new Set(request.data.students.map((student) => student.classId)),
    ];

    const existingClasses = await this.prisma.class.findMany({
      where: {
        id: {
          in: classIds,
        },
      },
      select: {
        id: true,
      },
    });

    const existingClassIds = existingClasses.map((cls) => cls.id);
    const invalidClassIds = classIds.filter(
      (classId) => !existingClassIds.includes(classId),
    );

    if (invalidClassIds.length > 0) {
      throw new ForbiddenException(
        `Invalid classIds found: ${invalidClassIds.join(', ')}`,
      );
    }
  }

  private async validateSchool(request: RequestCreateManyStudents) {
    const schoolIds = [
      ...new Set(request.data.students.map((student) => student.schoolId)),
    ];
    const existingSchools = await this.prisma.school.findMany({
      where: {
        id: {
          in: schoolIds,
        },
      },
      select: {
        id: true,
      },
    });
    const existingSchoolIds = existingSchools.map((school) => school.id);
    const invalidSchoolIds = schoolIds.filter(
      (schoolId) => !existingSchoolIds.includes(schoolId),
    );

    if (invalidSchoolIds.length > 0) {
      throw new ForbiddenException(
        `Invalid schoolIds found: ${invalidSchoolIds.join(', ')}`,
      );
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
