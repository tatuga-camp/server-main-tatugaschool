import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AttendanceTable, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
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
    private redisService: RedisService,
    private prismaReadService: PrismaReadService,
  ) {
    this.logger = new Logger(AttendanceTableRepository.name);
  }

  private getCacheKey(subjectId: string): string {
    return `attendance_table:subjectId:${subjectId}`;
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
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string') {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result =
          await this.prismaReadService.attendanceTable.findMany(request);
        if (result && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }

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
      if (result.subjectId) {
        await this.redisService.del(this.getCacheKey(result.subjectId));
      }
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
      if (result.subjectId) {
        await this.redisService.del(this.getCacheKey(result.subjectId));
      }
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

      if (remove.subjectId) {
        await this.redisService.del(this.getCacheKey(remove.subjectId));
      }

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
