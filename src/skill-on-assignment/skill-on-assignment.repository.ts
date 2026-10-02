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

import { Prisma } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

type SkillOnAssignmentRepositoryType = {
  findMany(
    request: Prisma.SkillOnAssignmentFindManyArgs,
  ): Promise<SkillOnAssignment[]>;
  getById(request: RequestGetById): Promise<SkillOnAssignment | null>;
  create(request: RequestCreate): Promise<SkillOnAssignment>;
  delete(request: RequestDelete): Promise<{ message: string }>;
  getByAssignmentId(
    request: RequestGetByAssignmentId,
  ): Promise<SkillOnAssignment[]>;
  getBySkillId(request: RequestGetBySkillId): Promise<SkillOnAssignment[]>;
  getBySubjectId(request: RequestGetBySubjectId): Promise<SkillOnAssignment[]>;
  deleteByAssignmentId(request: {
    assignmentId: string;
    subjectId: string;
  }): Promise<{ message: string }>;
};
@Injectable()
export class SkillOnAssignmentRepository
  implements SkillOnAssignmentRepositoryType
{
  logger: Logger = new Logger(SkillOnAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findMany(
    request: Prisma.SkillOnAssignmentFindManyArgs,
  ): Promise<SkillOnAssignment[]> {
    try {
      return await this.prisma.skillOnAssignment.findMany(request);
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

      const result = skillOnAssignment;
      await this.cache.bump(subjectScope(result.subjectId, 'assignments'));
      return result;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Skill on assignment already exists');
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
      const skill = await this.prisma.skillOnAssignment.delete({
        where: { id: request.id },
      });

      const result = { message: 'Skill on assignment deleted successfully' };
      await this.cache.bump(subjectScope(skill.subjectId, 'assignments'));
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

  async deleteByAssignmentId(request: {
    assignmentId: string;
    subjectId: string;
  }): Promise<{ message: string }> {
    try {
      await this.prisma.skillOnAssignment.deleteMany({
        where: { assignmentId: request.assignmentId },
      });
      await this.cache.bump(subjectScope(request.subjectId, 'assignments'));

      const result = { message: 'Skill on assignment deleted successfully' };

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
