import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, School } from '@prisma/client';
import { RequestCreateSchool, RequestUpdateSchool } from './interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GoogleStorageService } from '../google-storage/google-storage.service';

export type SchoolRepositoryType = {
  findMany(request: Prisma.SchoolFindManyArgs): Promise<School[]>;
  getById(request: { schoolId: string }): Promise<School>;
  create(request: Prisma.SchoolCreateArgs): Promise<School>;
  update(request: RequestUpdateSchool): Promise<School>;
  delete(request: { schoolId: string }): Promise<{ message: string }>;
  getSchoolById(request: { schoolId: string }): Promise<School>;
};

@Injectable()
export class SchoolRepository implements SchoolRepositoryType {
  logger: Logger;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.logger = new Logger(SchoolRepository.name);
  }

  async findMany(request: Prisma.SchoolFindManyArgs): Promise<School[]> {
    try {
      return await this.prisma.school.findMany(request);
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

  async getById(request: { schoolId: string }): Promise<School> {
    try {
      return await this.prisma.school.findUnique({
        where: {
          id: request.schoolId,
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

  async create(request: Prisma.SchoolCreateArgs): Promise<School> {
    try {
      return await this.prisma.school.create(request);
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

  async update(request: RequestUpdateSchool): Promise<School> {
    try {
      return await this.prisma.school.update({
        where: {
          id: request.query.schoolId,
        },
        data: {
          ...request.body,
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

  async delete(request: { schoolId: string }): Promise<{ message: string }> {
    try {
      const { schoolId } = request;
      // Delete related records in reverse order of their dependencies
      const fileOnAssignments = await this.prisma.fileOnAssignment.findMany({
        where: {
          schoolId: schoolId,
        },
      });

      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany({
          where: {
            schoolId: schoolId,
          },
        });

      const files = [...fileOnAssignments, ...fileOnStudentAssignments];

      Promise.allSettled([
        ...files.map((file) => {
          this.googleStorageService.DeleteFileOnStorage({ fileName: file.url });
        }),
      ]);

      await Promise.all([
        this.prisma.attendance.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.scoreOnStudent.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.commentOnAssignment.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.fileOnStudentAssignment.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.fileOnAssignment.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.memberOnTeam.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.task.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
      ]);

      await Promise.all([
        this.prisma.attendanceRow.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.scoreOnSubject.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.studentOnAssignment.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.teacherOnSubject.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.colum.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
      ]);

      await Promise.all([
        this.prisma.attendanceTable.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.assignment.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.studentOnSubject.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.board.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
      ]);

      await Promise.all([
        this.prisma.subject.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.student.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.team.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
        this.prisma.memberOnSchool.deleteMany({
          where: {
            schoolId: schoolId,
          },
        }),
      ]);

      await this.prisma.class.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });
      // Finally, delete the school record itself
      await this.prisma.school.delete({
        where: {
          id: schoolId,
        },
      });

      return { message: 'School deleted successfully' };
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
  async getSchoolById(request: { schoolId: string }): Promise<School> {
    try {
      return await this.prisma.school.findUnique({
        where: {
          id: request.schoolId,
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
}
