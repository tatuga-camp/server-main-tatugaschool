import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateScoreOnStudent,
  RequestDeleteScoreOnStudent,
  RequestGetAllScoreOnStudentByStudentId,
  RequestGetAllScoreOnStudentBySubjectId,
  RequestUpdateScoreOnStudent,
} from './interfaces';
import { Prisma, ScoreOnStudent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type ScoreOnStudentRepositoryType = {
  findMany(
    request: Prisma.ScoreOnStudentFindManyArgs,
  ): Promise<ScoreOnStudent[]>;
  getAllScoreOnStudentBySubjectId(
    request: RequestGetAllScoreOnStudentBySubjectId,
  ): Promise<ScoreOnStudent[]>;
  getAllScoreOnStudentByStudentId(
    request: RequestGetAllScoreOnStudentByStudentId,
  ): Promise<ScoreOnStudent[]>;
  createSocreOnStudent(
    request: RequestCreateScoreOnStudent,
  ): Promise<ScoreOnStudent>;
  updateScoreOnStudent(
    request: RequestUpdateScoreOnStudent,
  ): Promise<ScoreOnStudent>;

  deleteScoreOnStudent(
    request: RequestDeleteScoreOnStudent,
  ): Promise<{ message: string }>;
};
@Injectable()
export class ScoreOnStudentRepository implements ScoreOnStudentRepositoryType {
  logger: Logger = new Logger(ScoreOnStudentRepository.name);
  constructor(private prisma: PrismaService) {}

  async findMany(
    request: Prisma.ScoreOnStudentFindManyArgs,
  ): Promise<ScoreOnStudent[]> {
    try {
      return await this.prisma.scoreOnStudent.findMany(request);
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

  async getAllScoreOnStudentBySubjectId(
    request: RequestGetAllScoreOnStudentBySubjectId,
  ): Promise<ScoreOnStudent[]> {
    try {
      return await this.prisma.scoreOnStudent.findMany({
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

  async getAllScoreOnStudentByStudentId(
    request: RequestGetAllScoreOnStudentByStudentId,
  ): Promise<ScoreOnStudent[]> {
    try {
      return await this.prisma.scoreOnStudent.findMany({
        where: {
          studentOnSubjectId: request.studentOnSubjectId,
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

  async createSocreOnStudent(
    request: RequestCreateScoreOnStudent,
  ): Promise<ScoreOnStudent> {
    try {
      return await this.prisma.scoreOnStudent.create({
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

  async updateScoreOnStudent(
    request: RequestUpdateScoreOnStudent,
  ): Promise<ScoreOnStudent> {
    try {
      return await this.prisma.scoreOnStudent.update({
        where: {
          id: request.query.scoreOnStudentId,
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

  async deleteScoreOnStudent(
    request: RequestDeleteScoreOnStudent,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.scoreOnStudent.delete({
        where: {
          id: request.scoreOnStudentId,
        },
      });
      return { message: 'Delete score on student successfully' };
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
