import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Student } from '@prisma/client';

import { MemberOnSchoolService } from 'src/member-on-school/member-on-school.service';
import {
  RequestCreateManyStudents,
  RequestCreateStudent,
  RequestGetAllStudents,
  RequestGetStudent,
} from '../interface/student.interface';

export type StudentRepositoryType = {
  create(request: RequestCreateStudent): Promise<Student>;
  createMany(request: RequestCreateManyStudents): Promise<Student[]>;
  findById(request: RequestGetStudent): Promise<Student | null>;
  findAll(request: RequestGetAllStudents): Promise<Student[]>;
};

@Injectable()
export class StudentRepository implements StudentRepositoryType {
  constructor(
    private prisma: PrismaService,
    private memberOnSchoolService: MemberOnSchoolService,
  ) {}

  async create(request: RequestCreateStudent): Promise<Student> {
    return this.prisma.student.create({
      data: request.data,
    });
  }

  async createMany(request: RequestCreateManyStudents): Promise<Student[]> {
    return this.prisma.student.createMany({
      data: request.data.students,
    });
  }

  async findById(request: RequestGetStudent): Promise<Student | null> {
    return this.prisma.student.findUnique({
      where: { id: request.id },
    });
  }

  async findAll(request: RequestGetAllStudents): Promise<Student[]> {
    return this.prisma.student.findMany({
      where: { classId: request.classId },
    });
  }
}
