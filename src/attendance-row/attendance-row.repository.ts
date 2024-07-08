import { Injectable, Logger } from '@nestjs/common';
import {
  RequestCreateAttendanceRow,
  RequestDeleteAttendanceRow,
  RequestGetAttendanceRowById,
  RequestGetAttendanceRows,
  RequestUpdateAttendanceRow,
  ResponseGetAttendanceRowById,
} from './interfaces';
import { AttendanceRow, StudentOnSubject } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AttendanceRowRepositoryType = {
  getAttendanceRows(
    request: RequestGetAttendanceRows,
  ): Promise<AttendanceRow[]>;
  getAttendanceRowById(
    request: RequestGetAttendanceRowById,
  ): Promise<ResponseGetAttendanceRowById>;
  createAttendanceRow(
    request: RequestCreateAttendanceRow,
  ): Promise<AttendanceRow>;
  updateAttendanceRow(
    request: RequestUpdateAttendanceRow,
  ): Promise<AttendanceRow>;
  deleteAttendanceRow(
    request: RequestDeleteAttendanceRow,
  ): Promise<{ message: string }>;
};
@Injectable()
export class AttendanceRowRepository implements AttendanceRowRepositoryType {
  logger: Logger;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(AttendanceRowRepository.name);
  }

  async getAttendanceRows(
    request: RequestGetAttendanceRows,
  ): Promise<AttendanceRow[]> {
    try {
      return this.prisma.attendanceRow.findMany({
        where: {
          attendanceTableId: request.attendanceTableId,
        },
      });
    } catch (error) {
      this.logger.error(error);
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
      throw error;
    }
  }

  async createAttendanceRow(
    request: RequestCreateAttendanceRow,
  ): Promise<AttendanceRow> {
    try {
      const row = await this.prisma.attendanceRow.create({
        data: {
          ...request,
        },
      });

      const studentOnSubjects = await this.prisma.studentOnSubject.findMany({
        where: {
          subjectId: request.subjectId,
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

      await this.prisma.attendance.createMany({
        data: students,
      });

      return row;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateAttendanceRow(
    request: RequestUpdateAttendanceRow,
  ): Promise<AttendanceRow> {
    try {
      return this.prisma.attendanceRow.update({
        where: {
          id: request.query.attendanceRowId,
        },
        data: {
          ...request.body,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteAttendanceRow(
    request: RequestDeleteAttendanceRow,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.attendanceRow.delete({
        where: {
          id: request.attendanceRowId,
        },
      });

      await this.prisma.attendance.deleteMany({
        where: {
          attendanceRowId: request.attendanceRowId,
        },
      });

      return { message: 'Attendance row deleted successfully' };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
