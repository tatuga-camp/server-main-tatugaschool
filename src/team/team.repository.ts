import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, Team } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findUnique(request: Prisma.TeamFindUniqueArgs): Promise<Team | null>;
  create(request: Prisma.TeamCreateArgs): Promise<Team>;
  update(request: Prisma.TeamUpdateArgs): Promise<Team>;
  delete(request: Prisma.TeamDeleteArgs): Promise<Team>;
  findMany(request: Prisma.TeamFindManyArgs): Promise<Team[]>;
  counts(request: Prisma.TeamCountArgs): Promise<number>;
};
@Injectable()
export class TeamRepository implements Repository {
  logger: Logger = new Logger('TeamRepository');
  constructor(private prisma: PrismaService) {}

  async findUnique(request: Prisma.TeamFindUniqueArgs): Promise<Team | null> {
    try {
      return await this.prisma.team.findUnique(request);
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

  async create(request: Prisma.TeamCreateArgs): Promise<Team> {
    try {
      return await this.prisma.team.create(request);
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

  async update(request: Prisma.TeamUpdateArgs): Promise<Team> {
    try {
      return await this.prisma.team.update(request);
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

  async delete(request: Prisma.TeamDeleteArgs): Promise<Team> {
    try {
      return await this.prisma.team.delete(request);
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

  async findMany(request: Prisma.TeamFindManyArgs): Promise<Team[]> {
    try {
      return await this.prisma.team.findMany(request);
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

  async counts(request: Prisma.TeamCountArgs): Promise<number> {
    try {
      return await this.prisma.team.count(request);
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
