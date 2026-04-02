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
import { RedisService } from '../redis/redis.service';

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
    private redisService: RedisService,
  ) {
    this.logger = new Logger(AttendanceRepository.name);
  }

  private getCacheKey(subjectId: string): string {
    return `subjectId:${subjectId}`;
  }

  async create(request: Prisma.AttendanceCreateArgs): Promise<Attendance> {
    try {
      const result = await this.prisma.attendance.create(request);
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

  async findMany(
    request: Prisma.AttendanceFindManyArgs,
  ): Promise<Attendance[]> {
    try {
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string') {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.attendance.findMany(request);
        if (result && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }

      return await this.prisma.attendance.findMany(request);
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
}
