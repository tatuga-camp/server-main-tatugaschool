import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, SkillOnStudentAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { RedisService } from '../redis/redis.service';

type Repository = {
  findFirst(
    request: Prisma.SkillOnStudentAssignmentFindFirstArgs,
  ): Promise<SkillOnStudentAssignment | null>;
  findUnique(
    request: Prisma.SkillOnStudentAssignmentFindUniqueArgs,
  ): Promise<SkillOnStudentAssignment>;
  create(
    request: Prisma.SkillOnStudentAssignmentCreateArgs,
  ): Promise<SkillOnStudentAssignment>;
  update(
    request: Prisma.SkillOnStudentAssignmentUpdateArgs,
  ): Promise<SkillOnStudentAssignment>;
  delete(
    request: Prisma.SkillOnStudentAssignmentDeleteArgs,
  ): Promise<SkillOnStudentAssignment>;
  deleteMany(
    request: Prisma.SkillOnStudentAssignmentDeleteManyArgs,
  ): Promise<{ count: number }>;
  findMany(
    request: Prisma.SkillOnStudentAssignmentFindManyArgs,
  ): Promise<SkillOnStudentAssignment[]>;
  counts(request: Prisma.SkillOnStudentAssignmentCountArgs): Promise<number>;
};
@Injectable()
export class SkillOnStudentAssignmentRepository implements Repository {
  private logger: Logger = new Logger(SkillOnStudentAssignmentRepository.name);
  constructor(
    private prisma: PrismaService,
    private redisService?: RedisService,
  ) {}

  async findFirst(
    request: Prisma.SkillOnStudentAssignmentFindFirstArgs,
  ): Promise<SkillOnStudentAssignment | null> {
    try {
      return await this.prisma.skillOnStudentAssignment.findFirst(request);
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

  async findUnique(
    request: Prisma.SkillOnStudentAssignmentFindUniqueArgs,
  ): Promise<SkillOnStudentAssignment> {
    try {
      return await this.prisma.skillOnStudentAssignment.findUnique(request);
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
    request: Prisma.SkillOnStudentAssignmentCreateArgs,
  ): Promise<SkillOnStudentAssignment> {
    try {
      const result = await this.prisma.skillOnStudentAssignment.create(request);
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        } else if (result.subjectId) {
          await this.redisService?.del(this.getCacheKey(result.subjectId));
        }
      }
      return result;
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException(
            'This skill on student assignment already exists',
          );
        }

        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(
    request: Prisma.SkillOnStudentAssignmentUpdateArgs,
  ): Promise<SkillOnStudentAssignment> {
    try {
      const result = await this.prisma.skillOnStudentAssignment.update(request);
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        } else if (result.subjectId) {
          await this.redisService?.del(this.getCacheKey(result.subjectId));
        }
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
    request: Prisma.SkillOnStudentAssignmentDeleteArgs,
  ): Promise<SkillOnStudentAssignment> {
    try {
      const result = await this.prisma.skillOnStudentAssignment.delete(request);
      if (result) {
        if (Array.isArray(result)) {
          for (const item of result) {
            if (item.subjectId) {
              await this.redisService?.del(this.getCacheKey(item.subjectId));
            }
          }
        } else if (result.subjectId) {
          await this.redisService?.del(this.getCacheKey(result.subjectId));
        }
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

  async findMany(
    request: Prisma.SkillOnStudentAssignmentFindManyArgs,
  ): Promise<SkillOnStudentAssignment[]> {
    try {
      const subjectId = request.where?.subjectId;
      if (typeof subjectId === 'string' && this.redisService) {
        const cacheKey = this.getCacheKey(subjectId);
        const field = JSON.stringify(request);
        const cached = await this.redisService.hget(cacheKey, field);
        if (cached) {
          return JSON.parse(cached);
        }

        const result =
          await this.prisma.skillOnStudentAssignment.findMany(request);
        if (result && Array.isArray(result) && result.length > 0) {
          await this.redisService.hset(cacheKey, field, JSON.stringify(result));
          await this.redisService.expire(cacheKey, 3600);
        }
        return result;
      }
      return await this.prisma.skillOnStudentAssignment.findMany(request);
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

  async counts(
    request: Prisma.SkillOnStudentAssignmentCountArgs,
  ): Promise<number> {
    try {
      return await this.prisma.skillOnStudentAssignment.count(request);
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
    request: Prisma.SkillOnStudentAssignmentDeleteManyArgs,
  ): Promise<{ count: number }> {
    try {
      const result =
        await this.prisma.skillOnStudentAssignment.deleteMany(request);

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
