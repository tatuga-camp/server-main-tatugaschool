import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestGetAttendanceById,
  RequestUpdateAttendanceById,
} from './interfaces';
import { Attendance, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { PrismaReadService } from '../prisma/prisma-read.service';

export type AttendanceRepositoryType = {
  getAttendanceById(request: RequestGetAttendanceById): Promise<Attendance>;
  updateAttendanceById(
    request: RequestUpdateAttendanceById,
  ): Promise<Attendance>;
  findMany(request: Prisma.AttendanceFindManyArgs): Promise<Attendance[]>;
  create(request: Prisma.AttendanceCreateArgs): Promise<Attendance>;
};
@Injectable()
export class AttendanceRepository implements AttendanceRepositoryType {
  logger: Logger;
  constructor(
    private prisma: PrismaService,
    private prismaReadService: PrismaReadService,
    private cache: CacheService,
  ) {
    this.logger = new Logger(AttendanceRepository.name);
  }

  async create(request: Prisma.AttendanceCreateArgs): Promise<Attendance> {
    try {
      const result = await this.prisma.attendance.create(request);
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

  async findMany(
    request: Prisma.AttendanceFindManyArgs,
  ): Promise<Attendance[]> {
    try {
      return await this.prismaReadService.attendance.findMany(request);
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

  async getAttendanceById(
    request: RequestGetAttendanceById,
  ): Promise<Attendance> {
    try {
      return await this.prisma.attendance.findUnique({
        where: {
          id: request.attendanceId,
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

  async updateAttendanceById(
    request: RequestUpdateAttendanceById,
  ): Promise<Attendance> {
    try {
      const result = await this.prisma.attendance.update({
        where: {
          id: request.query.attendanceId,
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
}
