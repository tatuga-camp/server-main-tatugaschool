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
import { TeacherOnSubject } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type TeacherOnSubjectRepositoryType = {
  getById(request: RequestGetTeacherOnSubjectById): Promise<TeacherOnSubject>;

  getManyBySubjectId(
    request: RequestGetTeacherOnSubjectsBySubjectId,
  ): Promise<TeacherOnSubject[]>;
  getByTeacherIdAndSubjectId(
    request: RequestGetTeacherOnSubjectByTeacherIdAndSubjectId,
  ): Promise<TeacherOnSubject>;
  getManyByTeacherId(
    request: RequestGetTeacherOnSubjectsByTeacherId,
  ): Promise<TeacherOnSubject[]>;
  create(request: RequestCreateTeacherOnSubject): Promise<TeacherOnSubject>;
  update(request: RequestUpdateTeacherOnSubject): Promise<TeacherOnSubject>;
  delete(request: RequestDeleteTeacherOnSubject): Promise<{ message: string }>;
};
@Injectable()
export class TeacherOnSubjectRepository
  implements TeacherOnSubjectRepositoryType
{
  logger: Logger = new Logger(TeacherOnSubjectRepository.name);
  constructor(private prisma: PrismaService) {}

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
  ): Promise<TeacherOnSubject[]> {
    try {
      const teacherOnSubjects = await this.prisma.teacherOnSubject.findMany({
        where: { subjectId: request.subjectId },
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
      return teacherOnSubject;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'Teacher is already teaching this subject',
        );
      }
      this.logger.error(error.message);
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

  async delete(
    request: RequestDeleteTeacherOnSubject,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.teacherOnSubject.delete({
        where: { id: request.teacherOnSubjectId },
      });
      return { message: 'Teacher on subject deleted successfully' };
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
