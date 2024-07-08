import { Injectable, Logger } from '@nestjs/common';
import {
  RequestCreateScoreOnStudent,
  RequestDeleteScoreOnStudent,
  RequestGetAllScoreOnStudentByStudentId,
  RequestGetAllScoreOnStudentBySubjectId,
  RequestUpdateScoreOnStudent,
} from './interfaces';
import { ScoreOnStudent } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ScoreOnStudentRepositoryType = {
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

  async getAllScoreOnStudentBySubjectId(
    request: RequestGetAllScoreOnStudentBySubjectId,
  ): Promise<ScoreOnStudent[]> {
    try {
      return this.prisma.scoreOnStudent.findMany({
        where: {
          subjectId: request.subjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllScoreOnStudentByStudentId(
    request: RequestGetAllScoreOnStudentByStudentId,
  ): Promise<ScoreOnStudent[]> {
    try {
      return this.prisma.scoreOnStudent.findMany({
        where: {
          studentOnSubjectId: request.studentOnSubjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSocreOnStudent(
    request: RequestCreateScoreOnStudent,
  ): Promise<ScoreOnStudent> {
    try {
      return this.prisma.scoreOnStudent.create({
        data: {
          ...request,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateScoreOnStudent(
    request: RequestUpdateScoreOnStudent,
  ): Promise<ScoreOnStudent> {
    try {
      return this.prisma.scoreOnStudent.update({
        where: {
          id: request.query.scoreOnStudentId,
        },
        data: {
          ...request.body,
        },
      });
    } catch (error) {
      this.logger.error(error);
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
      throw error;
    }
  }
}
