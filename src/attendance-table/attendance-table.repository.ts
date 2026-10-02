import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AttendanceTable, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import {
  RequestCreateAttendanceTable,
  RequestDeleteAttendanceTable,
  RequestUpdateAttendanceTable,
} from './interfaces';
import { PrismaReadService } from '../prisma/prisma-read.service';

type Repository = {
  createAttendanceTable(
    request: RequestCreateAttendanceTable,
  ): Promise<AttendanceTable>;
  updateAttendanceTable(
    request: RequestUpdateAttendanceTable,
  ): Promise<AttendanceTable>;
  deleteAttendanceTable(
    request: RequestDeleteAttendanceTable,
  ): Promise<AttendanceTable>;
  findMany(
    request: Prisma.AttendanceTableFindManyArgs,
  ): Promise<AttendanceTable[]>;
  findUnique(
    request: Prisma.AttendanceTableFindUniqueArgs,
  ): Promise<AttendanceTable | null>;
};
@Injectable()
export class AttendanceTableRepository implements Repository {
  logger: Logger;
  constructor(
    private prisma: PrismaService,
    private prismaReadService: PrismaReadService,
    private cache: CacheService,
  ) {
    this.logger = new Logger(AttendanceTableRepository.name);
  }

  async findUnique(
    request: Prisma.AttendanceTableFindUniqueArgs,
  ): Promise<AttendanceTable | null> {
    try {
      return await this.prisma.attendanceTable.findUnique(request);
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
    request: Prisma.AttendanceTableFindManyArgs,
  ): Promise<AttendanceTable[]> {
    try {
      return await this.prismaReadService.attendanceTable.findMany(request);
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
      const result = await this.prisma.attendanceTable.create({
        data: {
          ...request,
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

  async updateAttendanceTable(
    request: RequestUpdateAttendanceTable,
  ): Promise<AttendanceTable> {
    try {
      const result = await this.prisma.attendanceTable.update({
        where: {
          id: request.query.attendanceTableId,
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
