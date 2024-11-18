import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateAttendanceTable,
  RequestDeleteAttendanceTable,
  RequestGetAttendanceTableById,
  RequestGetAttendanceTables,
  RequestUpdateAttendanceTable,
  ResponseGetAttendanceTableById,
} from './interfaces';
import { AttendanceTable } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type AttendanceTableRepositoryType = {
  getAttendanceTables(
    request: RequestGetAttendanceTables,
  ): Promise<AttendanceTable[]>;
  getAttendanceTableById(
    request: RequestGetAttendanceTableById,
  ): Promise<ResponseGetAttendanceTableById>;
  createAttendanceTable(
    request: RequestCreateAttendanceTable,
  ): Promise<AttendanceTable>;
  updateAttendanceTable(
    request: RequestUpdateAttendanceTable,
  ): Promise<AttendanceTable>;
  deleteAttendanceTable(
    request: RequestDeleteAttendanceTable,
  ): Promise<AttendanceTable>;
};
@Injectable()
export class AttendanceTableRepository
  implements AttendanceTableRepositoryType
{
  logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(AttendanceTableRepository.name);
  }

  async getAttendanceTables(
    request: RequestGetAttendanceTables,
  ): Promise<AttendanceTable[]> {
    try {
      return await this.prisma.attendanceTable.findMany({
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

  async getAttendanceTableById(
    request: RequestGetAttendanceTableById,
  ): Promise<ResponseGetAttendanceTableById> {
    try {
      const table = await this.prisma.attendanceTable.findUnique({
        where: {
          id: request.attendanceTableId,
        },
      });

      const [studentOnSubjects, rows] = await Promise.all([
        this.prisma.studentOnSubject.findMany({
          where: {
            subjectId: table.subjectId,
          },
        }),
        this.prisma.attendanceRow.findMany({
          where: {
            attendanceTableId: table.id,
          },
        }),
      ]);

      const attendances = await this.prisma.attendance.findMany({
        where: {
          attendanceRowId: {
            in: rows.map((row) => row.id),
          },
        },
      });

      return {
        ...table,
        rows: rows.map((row) => ({
          ...row,
          attendances: attendances.filter(
            (attendance) => attendance.attendanceRowId === row.id,
          ),
        })),
        students: studentOnSubjects,
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

  async createAttendanceTable(
    request: RequestCreateAttendanceTable,
  ): Promise<AttendanceTable> {
    try {
      return await this.prisma.attendanceTable.create({
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

  async updateAttendanceTable(
    request: RequestUpdateAttendanceTable,
  ): Promise<AttendanceTable> {
    try {
      return await this.prisma.attendanceTable.update({
        where: {
          id: request.query.attendanceTableId,
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

  async deleteAttendanceTable(
    request: RequestDeleteAttendanceTable,
  ): Promise<AttendanceTable> {
    try {
      await this.prisma.attendance.deleteMany({
        where: {
          attendanceTableId: request.attendanceTableId,
        },
      });

      await this.prisma.attendanceStatusList.deleteMany({
        where: {
          attendanceTableId: request.attendanceTableId,
        },
      });

      await this.prisma.attendanceRow.deleteMany({
        where: {
          attendanceTableId: request.attendanceTableId,
        },
      });

      const remove = await this.prisma.attendanceTable.delete({
        where: {
          id: request.attendanceTableId,
        },
      });

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
