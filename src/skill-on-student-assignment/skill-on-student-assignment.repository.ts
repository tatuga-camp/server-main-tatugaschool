import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, SkillOnStudentAssignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findById(
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
  constructor(private prisma: PrismaService) {}

  async findById(
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
      return await this.prisma.skillOnStudentAssignment.create(request);
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
      return await this.prisma.skillOnStudentAssignment.update(request);
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
      return await this.prisma.skillOnStudentAssignment.delete(request);
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
      return await this.prisma.skillOnStudentAssignment.deleteMany(request);
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
