import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ScoreOnSubject } from '@prisma/client';
import {
  RequestCreateSocreOnSubject,
  RequestGetAllScoreOnSubjectBySubjectId,
  RequestUpdateScoreOnSubject,
} from './interfaces';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export type ScoreOnSubjectRepositoryType = {
  getAllScoreOnSubjectBySubjectId(
    request: RequestGetAllScoreOnSubjectBySubjectId,
  ): Promise<ScoreOnSubject[]>;
  createSocreOnSubject(
    request: RequestCreateSocreOnSubject,
  ): Promise<ScoreOnSubject>;
  updateScoreOnSubject(
    request: RequestUpdateScoreOnSubject,
  ): Promise<ScoreOnSubject>;
};
@Injectable()
export class ScoreOnSubjectRepository implements ScoreOnSubjectRepositoryType {
  logger: Logger = new Logger(ScoreOnSubjectRepository.name);
  constructor(private prisma: PrismaService) {}

  async getAllScoreOnSubjectBySubjectId(
    request: RequestGetAllScoreOnSubjectBySubjectId,
  ): Promise<ScoreOnSubject[]> {
    try {
      return await this.prisma.scoreOnSubject.findMany({
        where: {
          subjectId: request.subjectId,
          isDeleted: false,
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

  async createSocreOnSubject(
    request: RequestCreateSocreOnSubject,
  ): Promise<ScoreOnSubject> {
    try {
      return await this.prisma.scoreOnSubject.create({
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

  async updateScoreOnSubject(
    request: RequestUpdateScoreOnSubject,
  ): Promise<ScoreOnSubject> {
    try {
      return await this.prisma.scoreOnSubject.update({
        where: {
          id: request.query.scoreOnSubjectId,
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
}
