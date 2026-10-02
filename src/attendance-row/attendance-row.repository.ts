import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  RequestDeleteAttendanceRow,
  RequestGetAttendanceRowById,
  RequestGetAttendanceRows,
  RequestUpdateAttendanceRow,
  ResponseGetAttendanceRowById,
} from './interfaces';
import { AttendanceRow, Prisma, StudentOnSubject } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

export type Repository = {
  findMany(request: Prisma.AttendanceRowFindManyArgs): Promise<AttendanceRow[]>;
  getAttendanceRowById(
    request: RequestGetAttendanceRowById,
  ): Promise<ResponseGetAttendanceRowById>;
  createAttendanceRow(
    request: Prisma.AttendanceRowCreateArgs,
  ): Promise<AttendanceRow>;
  updateAttendanceRow(
    request: RequestUpdateAttendanceRow,
  ): Promise<AttendanceRow>;
  deleteAttendanceRow(
    request: RequestDeleteAttendanceRow,
  ): Promise<AttendanceRow>;
};
@Injectable()
export class AttendanceRowRepository implements Repository {
  logger: Logger;
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {
    this.logger = new Logger(AttendanceRowRepository.name);
  }

  async findMany(
    request: Prisma.AttendanceRowFindManyArgs,
  ): Promise<AttendanceRow[]> {
    try {
      return await this.prisma.attendanceRow.findMany(request);
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

  async getAttendanceRowById(
    request: RequestGetAttendanceRowById,
  ): Promise<ResponseGetAttendanceRowById> {
    try {
      const rows = await this.prisma.attendanceRow.findUnique({
        where: {
          id: request.attendanceRowId,
        },
      });

      if (!rows) {
        throw new NotFoundException('attendancerowId is not found');
      }

      const attendances = await this.prisma.attendance.findMany({
        where: {
          attendanceRowId: rows.id,
        },
      });

      return {
        ...rows,
        attendances: attendances,
      };
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

  async createAttendanceRow(
    request: Prisma.AttendanceRowCreateArgs,
  ): Promise<AttendanceRow> {
    try {
      const row = await this.prisma.attendanceRow.create(request);

      const studentOnSubjects = await this.prisma.studentOnSubject.findMany({
        where: {
          subjectId: row.subjectId,
        },
      });

      const students = studentOnSubjects.map((student) => {
        return {
          startDate: row.startDate,
          endDate: row.endDate,
          attendanceTableId: row.attendanceTableId,
          studentId: student.studentId,
          attendanceRowId: row.id,
          studentOnSubjectId: student.id,
          schoolId: row.schoolId,
          subjectId: row.subjectId,
        };
      });

      if (students.length > 0) {
        await this.prisma.attendance.createMany({
          data: students,
        });
      }

      await this.cache.bump(subjectScope(row.subjectId, 'attendance'));

      return row;
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

  async updateAttendanceRow(
    request: RequestUpdateAttendanceRow,
  ): Promise<AttendanceRow> {
    try {
      const result = await this.prisma.attendanceRow.update({
        where: {
          id: request.query.attendanceRowId,
        },
        data: {
          ...request.body,
        },
      });
      await this.cache.bump(subjectScope(result.subjectId, 'attendance'));

      return result;
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

  async deleteAttendanceRow(
    request: RequestDeleteAttendanceRow,
  ): Promise<AttendanceRow> {
    try {
      await this.prisma.attendance.deleteMany({
        where: {
          attendanceRowId: request.attendanceRowId,
        },
      });

      const remove = await this.prisma.attendanceRow.delete({
        where: {
          id: request.attendanceRowId,
        },
      });

      await this.cache.bump(subjectScope(remove.subjectId, 'attendance'));

      return remove;
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
