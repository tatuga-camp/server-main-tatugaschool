import { AttendanceStatusList, Prisma } from '@prisma/client';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';

type Repository = {
  findUnique(
    request: Prisma.AttendanceStatusListFindUniqueArgs,
  ): Promise<AttendanceStatusList | null>;
  findMany(
    request: Prisma.AttendanceStatusListFindManyArgs,
  ): Promise<AttendanceStatusList[]>;
  create(
    request: Prisma.AttendanceStatusListCreateArgs,
  ): Promise<AttendanceStatusList>;
  update(
    request: Prisma.AttendanceStatusListUpdateArgs,
  ): Promise<AttendanceStatusList>;
  delete(
    request: Prisma.AttendanceStatusListDeleteArgs,
  ): Promise<AttendanceStatusList>;
  deleteMany(
    request: Prisma.AttendanceStatusListDeleteManyArgs,
  ): Promise<Prisma.BatchPayload>;
};
@Injectable()
export class AttendanceStatusListSRepository implements Repository {
  private logger: Logger = new Logger(AttendanceStatusListSRepository.name);
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {}

  async findUnique(
    request: Prisma.AttendanceStatusListFindUniqueArgs,
  ): Promise<AttendanceStatusList | null> {
    try {
      return await this.prisma.attendanceStatusList.findUnique(request);
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
    request: Prisma.AttendanceStatusListFindManyArgs,
  ): Promise<AttendanceStatusList[]> {
    try {
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.attendanceStatusList.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
      return await this.prisma.attendanceStatusList.findMany(request);
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

  async create(
    request: Prisma.AttendanceStatusListCreateArgs,
  ): Promise<AttendanceStatusList> {
    try {
      const result = await this.prisma.attendanceStatusList.create(request);
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
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

  async update(
    request: Prisma.AttendanceStatusListUpdateArgs,
  ): Promise<AttendanceStatusList> {
    try {
      const updated = await this.prisma.attendanceStatusList.update(request);

      const result = updated;
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
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

  async delete(
    request: Prisma.AttendanceStatusListDeleteArgs,
  ): Promise<AttendanceStatusList> {
    try {
      const result = await this.prisma.attendanceStatusList.delete(request);
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
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

  async findManyByAttendanceStatusListId(
    request: Prisma.AttendanceStatusListFindManyArgs,
  ): Promise<AttendanceStatusList[]> {
    try {
      return await this.prisma.attendanceStatusList.findMany(request);
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

  async deleteMany(
    request: Prisma.AttendanceStatusListDeleteManyArgs,
  ): Promise<Prisma.BatchPayload> {
    try {
      const result = await this.prisma.attendanceStatusList.deleteMany(request);

      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        await this.redisService?.del(this.getCacheKey(subjectId));
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

  private getCacheKey(subjectId: string): string {
    return `subjectId:${subjectId}`;
  }
}
