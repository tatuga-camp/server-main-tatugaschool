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
import { RedisService } from '../redis/redis.service';

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
  }): Promise<{ message: string }>;
};
@Injectable()
export class SkillOnAssignmentRepository
  implements SkillOnAssignmentRepositoryType
{
  logger: Logger = new Logger(SkillOnAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {}

  async findMany(
    request: Prisma.SkillOnAssignmentFindManyArgs,
  ): Promise<SkillOnAssignment[]> {
    try {
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result = await this.prisma.skillOnAssignment.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
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
      if (result.subjectId) {
        await this.redisService?.del(this.getCacheKey(result.subjectId));
      }
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
      if (skill.subjectId) {
        await this.redisService?.del(this.getCacheKey(skill.subjectId));
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
  }): Promise<{ message: string }> {
    try {
      await this.prisma.skillOnAssignment.deleteMany({
        where: { assignmentId: request.assignmentId },
      });

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

  private getCacheKey(subjectId: string): string {
    return `subjectId:${subjectId}`;
  }
}
