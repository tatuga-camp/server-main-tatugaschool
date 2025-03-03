import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Class, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { StudentRepository } from '../student/student.repository';
import { SubjectRepository } from '../subject/subject.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  RequestCreateClass,
  RequestDeleteClass,
  RequestGetClass,
} from './interfaces/class.interface';

export type Repository = {
  create(request: RequestCreateClass): Promise<Class>;
  update(request: Prisma.ClassUpdateArgs): Promise<Class>;
  findById(request: RequestGetClass): Promise<Class | null>;
  findAll(): Promise<Class[]>;
  findMany(request: Prisma.ClassFindManyArgs): Promise<Class[]>;
  delete(request: RequestDeleteClass): Promise<Class>;
  count(request: Prisma.ClassCountArgs): Promise<number>;
};

@Injectable()
export class ClassRepository implements Repository {
  logger = new Logger(ClassRepository.name);
  private subjectRepositry: SubjectRepository;
  private studentRepository: StudentRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.subjectRepositry = new SubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.studentRepository = new StudentRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async count(request: Prisma.ClassCountArgs): Promise<number> {
    try {
      return await this.prisma.class.count(request);
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

  async findMany(request: Prisma.ClassFindManyArgs): Promise<Class[]> {
    try {
      return await this.prisma.class.findMany(request);
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

  async create(request: RequestCreateClass) {
    try {
      return await this.prisma.class.create({
        data: {
          ...request,
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

  async update(request: Prisma.ClassUpdateArgs): Promise<Class> {
    try {
      return await this.prisma.class.update(request);
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

  async findById(request: RequestGetClass): Promise<Class | null> {
    try {
      return await this.prisma.class.findUnique({
        where: { id: request.classId },
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

  async findAll(): Promise<Class[]> {
    try {
      return await this.prisma.class.findMany();
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

  async delete(request: RequestDeleteClass): Promise<Class> {
    try {
      const subjects = await this.subjectRepositry.findMany({
        where: { classId: request.classId },
      });

      for (const subject of subjects) {
        await this.subjectRepositry.deleteSubject({
          subjectId: subject.id,
        });
      }

      const students = await this.studentRepository.findByClassId({
        classId: request.classId,
      });

      for (const student of students) {
        await this.studentRepository.delete({ studentId: student.id });
      }

      const classDelete = await this.prisma.class.delete({
        where: { id: request.classId },
      });
      this.logger.log(`Class ${request.classId} has been deleted`);
      return classDelete;
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
