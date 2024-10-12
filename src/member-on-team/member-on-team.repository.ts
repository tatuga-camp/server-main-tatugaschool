import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { MemberOnTeam, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findUnique(
    request: Prisma.MemberOnTeamFindUniqueArgs,
  ): Promise<MemberOnTeam | null>;
  create(request: Prisma.MemberOnTeamCreateArgs): Promise<MemberOnTeam>;
  update(request: Prisma.MemberOnTeamUpdateArgs): Promise<MemberOnTeam>;
  delete(request: Prisma.MemberOnTeamDeleteArgs): Promise<MemberOnTeam>;
  findMany(request: Prisma.MemberOnTeamFindManyArgs): Promise<MemberOnTeam[]>;
  counts(request: Prisma.MemberOnTeamCountArgs): Promise<number>;
  findFirst(
    request: Prisma.MemberOnTeamFindFirstArgs,
  ): Promise<MemberOnTeam | null>;
};
@Injectable()
export class MemberOnTeamRepository implements Repository {
  private logger: Logger = new Logger(MemberOnTeamRepository.name);
  constructor(private prisma: PrismaService) {}

  async findUnique(
    request: Prisma.MemberOnTeamFindUniqueArgs,
  ): Promise<MemberOnTeam | null> {
    try {
      return await this.prisma.memberOnTeam.findUnique(request);
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
    request: Prisma.MemberOnTeamFindFirstArgs,
  ): Promise<MemberOnTeam | null> {
    try {
      return await this.prisma.memberOnTeam.findFirst(request);
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

  async create(request: Prisma.MemberOnTeamCreateArgs): Promise<MemberOnTeam> {
    try {
      return await this.prisma.memberOnTeam.create(request);
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('Member already exists');
        }
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(request: Prisma.MemberOnTeamUpdateArgs): Promise<MemberOnTeam> {
    try {
      return await this.prisma.memberOnTeam.update(request);
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

  async delete(request: Prisma.MemberOnTeamDeleteArgs): Promise<MemberOnTeam> {
    try {
      return await this.prisma.memberOnTeam.delete(request);
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
    request: Prisma.MemberOnTeamFindManyArgs,
  ): Promise<MemberOnTeam[]> {
    try {
      return await this.prisma.memberOnTeam.findMany(request);
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

  async counts(request: Prisma.MemberOnTeamCountArgs): Promise<number> {
    try {
      return await this.prisma.memberOnTeam.count(request);
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
