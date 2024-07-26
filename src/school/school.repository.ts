import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { School } from '@prisma/client';
import { RequestCreateSchool, RequestUpdateSchool } from './interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type SchoolRepositoryType = {
  create(request: RequestCreateSchool): Promise<School>;
  update(request: RequestUpdateSchool): Promise<School>;
  delete(request: { schoolId: string }): Promise<{ message: string }>;
  getSchoolById(request: { schoolId: string }): Promise<School>;
};

@Injectable()
export class SchoolRepository implements SchoolRepositoryType {
  logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(SchoolRepository.name);
  }

  async create(request: RequestCreateSchool): Promise<School> {
    try {
      return await this.prisma.school.create({
        data: {
          ...request,
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
      await this.prisma.attendance.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.attendanceRow.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.attendanceTable.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.scoreOnStudent.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.scoreOnSubject.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.commentOnAssignmentStudent.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.commentOnAssignmentTeacher.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.fileOnStudentAssignment.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.studentOnAssignment.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.fileOnAssignment.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.assignment.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.teacherOnSubject.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.studentOnSubject.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.subject.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.student.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.memberOnTeam.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.memberOnSchool.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.team.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

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
