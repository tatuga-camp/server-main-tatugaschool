import { GoogleStorageService } from './../google-storage/google-storage.service';
import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Student } from '@prisma/client';

import {
  RequestCreateStudent,
  RequestDeleteStudent,
  RequestGetAllStudents,
  RequestGetStudent,
  RequestUpdateStudent,
} from './interface/request-student.interface';

import { Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  create(request: RequestCreateStudent): Promise<Student>;
  update(request: RequestUpdateStudent): Promise<Student>;
  findById(request: RequestGetStudent): Promise<Student | null>;
  findByClassId(request: RequestGetAllStudents): Promise<Student[]>;
  delete(request: RequestDeleteStudent): Promise<Student>;
  count(request: Prisma.StudentCountArgs): Promise<number>;
};

@Injectable()
export class StudentRepository implements Repository {
  private logger = new Logger(StudentRepository.name);
  private studentOnSubjectRepository: StudentOnSubjectRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async update(request: RequestUpdateStudent): Promise<Student> {
    try {
      const student = await this.prisma.student.update({
        where: { id: request.query.studentId },
        data: request.body,
      });
      const data = {
        title: student.title,
        firstName: student.firstName,
        lastName: student.lastName,
        photo: student.photo,
        blurHash: student.blurHash,
        number: student.number,
      };

      delete request.body.password;
      await Promise.allSettled([
        this.prisma.studentOnAssignment.updateMany({
          where: {
            studentId: student.id,
          },
          data: data,
        }),
        this.prisma.studentOnSubject.updateMany({
          where: {
            studentId: student.id,
          },
          data: data,
        }),
        this.prisma.commentOnAssignment.updateMany({
          where: {
            studentId: student.id,
          },
          data: data,
        }),
        this.prisma.scoreOnStudent.updateMany({
          where: {
            studentId: student.id,
          },
          data: data,
        }),
        this.prisma.studentOnGroup.updateMany({
          where: {
            studentId: student.id,
          },
          data: data,
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
      const student = await this.prisma.student.create({
        data: {
          ...request,
        },
      });

      const subjects = await this.prisma.subject.findMany({
        where: {
          classId: student.classId,
        },
      });

      const studentOnSubjects = await Promise.allSettled(
        subjects.map(async (subject) => {
          return this.prisma.studentOnSubject.create({
            data: {
              studentId: student.id,
              subjectId: subject.id,
              schoolId: student.schoolId,
              classId: student.classId,
              title: student.title,
              firstName: student.firstName,
              lastName: student.lastName,
              photo: student.photo,
              blurHash: student.blurHash,
              number: student.number,
            },
          });
        }),
      ).then((result) =>
        result.filter((r) => r.status === 'fulfilled').map((r) => r.value),
      );

      const assignments = await this.prisma.assignment.findMany({
        where: {
          OR: subjects.map((subject) => ({
            subjectId: subject.id,
          })),
        },
      });

      await Promise.allSettled(
        assignments.map(async (assignment) => {
          const studentOnSubject = studentOnSubjects.find(
            (s) => s.subjectId === assignment.subjectId,
          );
          return this.prisma.studentOnAssignment.create({
            data: {
              studentId: student.id,
              assignmentId: assignment.id,
              studentOnSubjectId: studentOnSubject.id,
              subjectId: assignment.subjectId,
              schoolId: student.schoolId,
              title: student.title,
              firstName: student.firstName,
              lastName: student.lastName,
              photo: student.photo,
              blurHash: student.blurHash,
              number: student.number,
            },
          });
        }),
      ).then((result) =>
        result.filter((r) => r.status === 'fulfilled').map((r) => r.value),
      );

      return student;
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

  async count(request: Prisma.StudentCountArgs): Promise<number> {
    try {
      return await this.prisma.student.count(request);
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

  async delete(request: RequestDeleteStudent): Promise<Student> {
    try {
      const studentOnSubjects = await this.prisma.studentOnSubject.findMany({
        where: { studentId: request.studentId },
      });

      await Promise.allSettled(
        studentOnSubjects.map(async (studentOnSubject) => {
          return this.studentOnSubjectRepository.delete({
            studentOnSubjectId: studentOnSubject.id,
          });
        }),
      );
      return await this.prisma.student.delete({
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
}
