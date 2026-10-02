import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateTeacherOnSubject,
  RequestDeleteTeacherOnSubject,
  RequestGetTeacherOnSubjectById,
  RequestGetTeacherOnSubjectByTeacherIdAndSubjectId,
  RequestGetTeacherOnSubjectsBySubjectId,
  RequestGetTeacherOnSubjectsByTeacherId,
  RequestUpdateTeacherOnSubject,
} from './interfaces';
import {
  Prisma,
  SubscriptionNotification,
  TeacherOnSubject,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

type TeacherOnSubjectRepositoryType = {
  getById(request: RequestGetTeacherOnSubjectById): Promise<TeacherOnSubject>;
  getManyBySubjectId(request: RequestGetTeacherOnSubjectsBySubjectId): Promise<
    (TeacherOnSubject & {
      user: { subscriptionNotifications: SubscriptionNotification[] };
    })[]
  >;
  getByTeacherIdAndSubjectId(
    request: RequestGetTeacherOnSubjectByTeacherIdAndSubjectId,
  ): Promise<TeacherOnSubject>;
  getManyByTeacherId(
    request: RequestGetTeacherOnSubjectsByTeacherId,
  ): Promise<TeacherOnSubject[]>;
  create(request: RequestCreateTeacherOnSubject): Promise<TeacherOnSubject>;
  update(request: RequestUpdateTeacherOnSubject): Promise<TeacherOnSubject>;
  findMany(
    request: Prisma.TeacherOnSubjectFindManyArgs,
  ): Promise<TeacherOnSubject[]>;
  delete(request: RequestDeleteTeacherOnSubject): Promise<{ message: string }>;
};
@Injectable()
export class TeacherOnSubjectRepository
  implements TeacherOnSubjectRepositoryType
{
  logger: Logger = new Logger(TeacherOnSubjectRepository.name);
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findMany(
    request: Prisma.TeacherOnSubjectFindManyArgs,
  ): Promise<TeacherOnSubject[]> {
    try {
      return await this.prisma.teacherOnSubject.findMany(request);
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

  async getById(
    request: RequestGetTeacherOnSubjectById,
  ): Promise<TeacherOnSubject> {
    try {
      const teacherOnSubject = await this.prisma.teacherOnSubject.findUnique({
        where: { id: request.teacherOnSubjectId },
      });
      return teacherOnSubject;
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

  async getByTeacherIdAndSubjectId(
    request: RequestGetTeacherOnSubjectByTeacherIdAndSubjectId,
  ): Promise<TeacherOnSubject> {
    try {
      const teacherOnSubject = await this.prisma.teacherOnSubject.findFirst({
        where: {
          userId: request.teacherId,
          subjectId: request.subjectId,
        },
      });
      return teacherOnSubject;
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

  async getManyBySubjectId(
    request: RequestGetTeacherOnSubjectsBySubjectId,
  ): Promise<
    (TeacherOnSubject & {
      user: { subscriptionNotifications: SubscriptionNotification[] };
    })[]
  > {
    try {
      const teacherOnSubjects = await this.prisma.teacherOnSubject.findMany({
        where: { subjectId: request.subjectId },
        include: {
          user: {
            include: {
              subscriptionNotifications: true,
            },
          },
        },
      });
      return teacherOnSubjects;
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

  async getManyByTeacherId(
    request: RequestGetTeacherOnSubjectsByTeacherId,
  ): Promise<TeacherOnSubject[]> {
    try {
      const teacherOnSubjects = await this.prisma.teacherOnSubject.findMany({
        where: { userId: request.teacherId },
      });
      return teacherOnSubjects;
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
    request: RequestCreateTeacherOnSubject,
  ): Promise<TeacherOnSubject> {
    try {
      const teacherOnSubject = await this.prisma.teacherOnSubject.create({
        data: {
          ...request,
        },
      });

      const result = teacherOnSubject;
      if (result.subjectId) {
        await this.cache.bump(subjectScope(result.subjectId, 'roster'));
      }

      return result;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Teacher is already teaching this subject',
        );
      }
      throw error;
    }
  }

  async update(
    request: RequestUpdateTeacherOnSubject,
  ): Promise<TeacherOnSubject> {
    try {
      const teacherOnSubject = await this.prisma.teacherOnSubject.update({
        where: { id: request.query.teacherOnSubjectId },
        data: {
          ...request.body,
        },
      });

      const result = teacherOnSubject;
      if (result.subjectId) {
        await this.cache.bump(subjectScope(result.subjectId, 'roster'));
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
    request: RequestDeleteTeacherOnSubject,
  ): Promise<{ message: string }> {
    try {
      const teacher = await this.prisma.teacherOnSubject.delete({
        where: { id: request.teacherOnSubjectId },
      });

      const result = { message: 'Teacher on subject deleted successfully' };
      if (teacher.subjectId) {
        await this.cache.bump(subjectScope(teacher.subjectId, 'roster'));
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
