import { AttendanceStatusList, Prisma } from '@prisma/client';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

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
    subjectId: string,
  ): Promise<Prisma.BatchPayload>;
};
@Injectable()
export class AttendanceStatusListSRepository implements Repository {
  private logger: Logger = new Logger(AttendanceStatusListSRepository.name);
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
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

  async update(
    request: Prisma.AttendanceStatusListUpdateArgs,
  ): Promise<AttendanceStatusList> {
    try {
      const updated = await this.prisma.attendanceStatusList.update(request);

      const result = updated;
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

  async delete(
    request: Prisma.AttendanceStatusListDeleteArgs,
  ): Promise<AttendanceStatusList> {
    try {
      const result = await this.prisma.attendanceStatusList.delete(request);
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
    subjectId: string,
  ): Promise<Prisma.BatchPayload> {
    try {
      const result = await this.prisma.attendanceStatusList.deleteMany(request);
      await this.cache.bump(subjectScope(subjectId, 'attendance'));

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
