import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Career, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

type Repository = {
  findUnique(request: Prisma.CareerFindUniqueArgs): Promise<Career | null>;
  findMany(request: Prisma.CareerFindManyArgs): Promise<Career[]>;
  create(request: Prisma.CareerCreateArgs): Promise<Career>;
  update(request: Prisma.CareerUpdateArgs): Promise<Career>;
  delete(request: Prisma.CareerDeleteArgs): Promise<{ message: string }>;
  counts(request: Prisma.CareerCountArgs): Promise<number>;
};

@Injectable()
export class CareerRepository implements Repository {
  private logger: Logger = new Logger(CareerRepository.name);
  constructor(private prisma: PrismaService) {}

  async findUnique(
    request: Prisma.CareerFindUniqueArgs,
  ): Promise<Career | null> {
    try {
      return await this.prisma.career.findUnique(request);
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

  async findMany(request: Prisma.CareerFindManyArgs): Promise<Career[]> {
    try {
      return await this.prisma.career.findMany(request);
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

  async create(request: Prisma.CareerCreateArgs): Promise<Career> {
    try {
      return await this.prisma.career.create(request);
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

  async update(request: Prisma.CareerUpdateArgs): Promise<Career> {
    try {
      const update = await this.prisma.career.update(request);
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

  async delete(request: Prisma.CareerDeleteArgs): Promise<{ message: string }> {
    try {
      const career = await this.prisma.career.delete(request);

      await this.prisma.skillOnCareer.deleteMany({
        where: {
          careerId: career.id,
        },
      });

      return { message: 'Career deleted successfully' };
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

  async counts(request: Prisma.CareerCountArgs): Promise<number> {
    try {
      return await this.prisma.career.count(request);
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
