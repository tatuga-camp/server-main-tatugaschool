import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, StudentOnSubject } from '@prisma/client';
import {
  RequestCreateStudentOnSubject,
  RequestDeleteStudentOnSubject,
  RequestGetStudentOnSubjectById,
  RequestGetStudentOnSubjectByStudentId,
  RequestGetStudentOnSubjectBySubjectId,
  RequestUpdateStudentOnSubject,
} from './interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type StudentOnSubjectRepositoryType = {
  getStudentOnSubjectsBySubjectId(
    request: RequestGetStudentOnSubjectBySubjectId,
  ): Promise<StudentOnSubject[]>;
  getStudentOnSubjectsByStudentId(
    request: RequestGetStudentOnSubjectByStudentId,
  ): Promise<StudentOnSubject[]>;
  getStudentOnSubjectById(
    request: RequestGetStudentOnSubjectById,
  ): Promise<StudentOnSubject | null>;
  createStudentOnSubject(
    request: RequestCreateStudentOnSubject,
  ): Promise<StudentOnSubject>;
  updateStudentOnSubject(
    request: RequestUpdateStudentOnSubject,
  ): Promise<StudentOnSubject>;
  deleteStudentOnSubject(
    request: RequestDeleteStudentOnSubject,
  ): Promise<{ message: string }>;
  update(request: Prisma.StudentOnSubjectUpdateArgs): Promise<StudentOnSubject>;
  findMany(
    request: Prisma.StudentOnSubjectFindManyArgs,
  ): Promise<StudentOnSubject[]>;
  createMany(
    request: Prisma.StudentOnSubjectCreateManyArgs,
  ): Promise<Prisma.BatchPayload>;
};
@Injectable()
export class StudentOnSubjectRepository
  implements StudentOnSubjectRepositoryType
{
  logger: Logger = new Logger(StudentOnSubjectRepository.name);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

  async getStudentOnSubjectsBySubjectId(
    request: RequestGetStudentOnSubjectBySubjectId,
  ): Promise<StudentOnSubject[]> {
    try {
      return await this.prisma.studentOnSubject.findMany({
        where: {
          subjectId: request.subjectId,
        },
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

  async getStudentOnSubjectsByStudentId(
    request: RequestGetStudentOnSubjectByStudentId,
  ): Promise<StudentOnSubject[]> {
    try {
      return await this.prisma.studentOnSubject.findMany({
        where: {
          studentId: request.studentId,
        },
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

  async findMany(
    request: Prisma.StudentOnSubjectFindManyArgs,
  ): Promise<StudentOnSubject[]> {
    try {
      return await this.prisma.studentOnSubject.findMany(request);
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

  async getStudentOnSubjectById(
    request: RequestGetStudentOnSubjectById,
  ): Promise<StudentOnSubject | null> {
    try {
      return await this.prisma.studentOnSubject.findUnique({
        where: {
          id: request.studentOnSubjectId,
        },
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

  async createStudentOnSubject(
    request: RequestCreateStudentOnSubject,
  ): Promise<StudentOnSubject> {
    try {
      return await this.prisma.studentOnSubject.create({
        data: request,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Duplicate student on subject');
        }
      }
      this.logger.error(error);
      throw error;
    }
  }

  async createMany(
    request: Prisma.StudentOnSubjectCreateManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      const create = await this.prisma.studentOnSubject.createMany(request);
      return create;
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

  async updateStudentOnSubject(
    request: RequestUpdateStudentOnSubject,
  ): Promise<StudentOnSubject> {
    try {
      return await this.prisma.studentOnSubject.update({
        where: {
          id: request.query.studentOnSubjectId,
        },
        data: request.data,
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

  async update(
    request: Prisma.StudentOnSubjectUpdateArgs,
  ): Promise<StudentOnSubject> {
    try {
      return await this.prisma.studentOnSubject.update(request);
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

  async deleteStudentOnSubject(
    request: RequestDeleteStudentOnSubject,
  ): Promise<{ message: string }> {
    try {
      const { studentOnSubjectId } = request;

      const studentOnAssignments =
        await this.prisma.studentOnAssignment.findMany({
          where: {
            studentOnSubjectId: studentOnSubjectId,
          },
        });
      // Fetch related entities
      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany({
          where: {
            studentOnAssignmentId: {
              in: studentOnAssignments.map(
                (studentOnAssignment) => studentOnAssignment.id,
              ),
            },
          },
        });

      // Delete related attendance records
      await this.prisma.attendance.deleteMany({
        where: { studentOnSubjectId },
      });

      // Delete related scoreOnStudents records
      await this.prisma.scoreOnStudent.deleteMany({
        where: { studentOnSubjectId },
      });

      // Delete related studentOnAssignments records
      await this.prisma.studentOnAssignment.deleteMany({
        where: { studentOnSubjectId },
      });

      // Delete related fileOnStudentAssignments records
      await this.prisma.fileOnStudentAssignment.deleteMany({
        where: {
          id: {
            in: fileOnStudentAssignments.map((file) => file.id),
          },
        },
      });

      // Delete related commentOnAssignments records
      await this.prisma.commentOnAssignment.deleteMany({
        where: {
          studentOnAssignmentId: {
            in: studentOnAssignments.map(
              (studentOnAssignment) => studentOnAssignment.id,
            ),
          },
        },
      });

      // Use Promise.allSettled to delete files in Google Storage
      Promise.allSettled(
        fileOnStudentAssignments.map((file) =>
          this.googleStorageService.DeleteFileOnStorage({ fileName: file.url }),
        ),
      );

      // Delete the StudentOnSubject
      await this.prisma.studentOnSubject.delete({
        where: { id: studentOnSubjectId },
      });

      return { message: 'Delete StudentOnSubject successfully' };
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
