import {
    BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreate,
  RequestDelete,
  RequestGetByAssignmentId,
  RequestGetById,
  RequestGetBySkillId,
  RequestGetBySubjectId,
} from './interfaces';
import { SkillOnAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type SkillOnAssignmentRepositoryType = {
  getById(request: RequestGetById): Promise<SkillOnAssignment | null>;
  create(request: RequestCreate): Promise<SkillOnAssignment>;
  delete(request: RequestDelete): Promise<{ message: string }>;
  getByAssignmentId(
    request: RequestGetByAssignmentId,
  ): Promise<SkillOnAssignment[]>;
  getBySkillId(request: RequestGetBySkillId): Promise<SkillOnAssignment[]>;
  getBySubjectId(request: RequestGetBySubjectId): Promise<SkillOnAssignment[]>;
};
@Injectable()
export class SkillOnAssignmentRepository
  implements SkillOnAssignmentRepositoryType
{
  logger: Logger = new Logger(SkillOnAssignmentRepository.name);
  constructor(private prisma: PrismaService) {}

  async getById(request: RequestGetById): Promise<SkillOnAssignment | null> {
    try {
      const skillOnAssignment = await this.prisma.skillOnAssignment.findUnique({
        where: { id: request.id },
      });

      return skillOnAssignment;
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

  async create(request: RequestCreate): Promise<SkillOnAssignment> {
    try {
      const skillOnAssignment = await this.prisma.skillOnAssignment.create({
        data: {
          ...request,
        },
      });

      return skillOnAssignment;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if(error.code === 'P2002'){
            throw new BadRequestException("Skill on assignment already exists");
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async delete(request: RequestDelete): Promise<{ message: string }> {
    try {
      await this.prisma.skillOnAssignment.delete({
        where: { id: request.id },
      });

      return { message: 'Skill on assignment deleted successfully' };
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

  async getByAssignmentId(
    request: RequestGetByAssignmentId,
  ): Promise<SkillOnAssignment[]> {
    try {
      const skillOnAssignment = await this.prisma.skillOnAssignment.findMany({
        where: { assignmentId: request.assignmentId },
      });

      return skillOnAssignment;
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

  async getBySkillId(
    request: RequestGetBySkillId,
  ): Promise<SkillOnAssignment[]> {
    try {
      const skillOnAssignment = await this.prisma.skillOnAssignment.findMany({
        where: { skillId: request.skillId },
      });

      return skillOnAssignment;
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

  async getBySubjectId(
    request: RequestGetBySubjectId,
  ): Promise<SkillOnAssignment[]> {
    try {
      const skillOnAssignment = await this.prisma.skillOnAssignment.findMany({
        where: { subjectId: request.subjectId },
      });

      return skillOnAssignment;
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
