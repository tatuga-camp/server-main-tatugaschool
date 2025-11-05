import { ClassService } from './../class/class.service';
import { SubjectService } from './../subject/subject.service';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Prisma, School } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { StorageService } from '../storage/storage.service';
import { StripeService } from '../stripe/stripe.service';

export type SchoolRepositoryType = {
  findMany(request: Prisma.SchoolFindManyArgs): Promise<School[]>;
  getById(request: { schoolId: string }): Promise<School>;
  create(request: Prisma.SchoolCreateArgs): Promise<School>;
  update(request: Prisma.SchoolUpdateArgs): Promise<School>;
  delete(request: { schoolId: string }): Promise<School>;
  getSchoolById(request: { schoolId: string }): Promise<School>;
  findUnique(request: Prisma.SchoolFindUniqueArgs): Promise<School>;
  findFirst(request: Prisma.SchoolFindFirstArgs): Promise<School | null>;
};

@Injectable()
export class SchoolRepository implements SchoolRepositoryType {
  logger: Logger;
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    private subjectService: SubjectService,
    private classService: ClassService,
    private stripe: StripeService,
  ) {
    this.logger = new Logger(SchoolRepository.name);
  }

  async findFirst(request: Prisma.SchoolFindFirstArgs): Promise<School | null> {
    try {
      return await this.prisma.school.findFirst(request);
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

  async findUnique(request: Prisma.SchoolFindUniqueArgs): Promise<School> {
    try {
      return await this.prisma.school.findUnique(request);
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

  async findMany(request: Prisma.SchoolFindManyArgs): Promise<School[]> {
    try {
      return await this.prisma.school.findMany(request);
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

  async getById(request: { schoolId: string }): Promise<School> {
    try {
      return await this.prisma.school.findUnique({
        where: {
          id: request.schoolId,
        },
      });
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

  async create(request: Prisma.SchoolCreateArgs): Promise<School> {
    try {
      return await this.prisma.school.create(request);
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

  async update(request: Prisma.SchoolUpdateArgs): Promise<School> {
    try {
      return await this.prisma.school.update(request);
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

  async delete(request: { schoolId: string }): Promise<School> {
    try {
      const { schoolId } = request;
      // Delete related records in reverse order of their dependencies
      const subjects = await this.subjectService.subjectRepository.findMany({
        where: {
          schoolId: schoolId,
        },
      });

      const classrooms = await this.classService.classRepository.findMany({
        where: {
          schoolId: schoolId,
        },
      });
      for (const subject of subjects) {
        await this.subjectService.subjectRepository.deleteSubject({
          subjectId: subject.id,
        });
      }

      for (const classroom of classrooms) {
        await this.classService.classRepository.delete({
          classId: classroom.id,
        });
      }

      await this.prisma.task.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.memberOnTeam.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.colum.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.board.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.team.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      await this.prisma.memberOnSchool.deleteMany({
        where: {
          schoolId: schoolId,
        },
      });

      const school = await this.prisma.school.delete({
        where: {
          id: schoolId,
        },
      });
      await this.stripe.customers
        .del(school.stripe_customer_id)
        .catch((e) => this.logger.error(e));
      return school;
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
  async getSchoolById(request: { schoolId: string }): Promise<School> {
    try {
      return await this.prisma.school.findUnique({
        where: {
          id: request.schoolId,
        },
      });
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
