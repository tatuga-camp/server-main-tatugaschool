import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, SkillOnCareer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findUnique(
    request: Prisma.SkillOnCareerFindUniqueArgs,
  ): Promise<SkillOnCareer | null>;
  findMany(request: Prisma.SkillOnCareerFindManyArgs): Promise<SkillOnCareer[]>;
  create(request: Prisma.SkillOnCareerCreateArgs): Promise<SkillOnCareer>;
  update(request: Prisma.SkillOnCareerUpdateArgs): Promise<SkillOnCareer>;
  delete(request: Prisma.SkillOnCareerDeleteArgs): Promise<{ message: string }>;
  counts(request: Prisma.SkillOnCareerCountArgs): Promise<number>;
  findFirst(
    request: Prisma.SkillOnCareerFindFirstArgs,
  ): Promise<SkillOnCareer | null>;
};
@Injectable()
export class SkillOnCareerRepository implements Repository {
  private logger: Logger = new Logger(SkillOnCareerRepository.name);
  constructor(private prisma: PrismaService) {}

  async findUnique(
    request: Prisma.SkillOnCareerFindUniqueArgs,
  ): Promise<SkillOnCareer | null> {
    try {
      return await this.prisma.skillOnCareer.findUnique(request);
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
    request: Prisma.SkillOnCareerFindManyArgs,
  ): Promise<SkillOnCareer[]> {
    try {
      return await this.prisma.skillOnCareer.findMany(request);
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
    request: Prisma.SkillOnCareerCreateArgs,
  ): Promise<SkillOnCareer> {
    try {
      return await this.prisma.skillOnCareer.create(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('SkillOnCareer already exists');
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(
    request: Prisma.SkillOnCareerUpdateArgs,
  ): Promise<SkillOnCareer> {
    try {
      const update = await this.prisma.skillOnCareer.update(request);
      return update;
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
    request: Prisma.SkillOnCareerDeleteArgs,
  ): Promise<{ message: string }> {
    try {
      const skillOnCareer = await this.prisma.skillOnCareer.delete(request);

      return { message: 'SkillOnCareer deleted successfully' };
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

  async counts(request: Prisma.SkillOnCareerCountArgs): Promise<number> {
    try {
      return await this.prisma.skillOnCareer.count(request);
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

  async findFirst(
    request: Prisma.SkillOnCareerFindFirstArgs,
  ): Promise<SkillOnCareer | null> {
    try {
      return await this.prisma.skillOnCareer.findFirst(request);
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
