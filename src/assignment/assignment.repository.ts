import { SkillOnAssignmentRepository } from './../skill-on-assignment/skill-on-assignment.repository';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { FileOnStudentAssignmentRepository } from './../file-on-student-assignment/file-on-student-assignment.repository';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestDeleteAssignment,
  RequestGetAssignmentById,
  RequestGetAssignmentBySubjectId,
} from './interfaces';
import { Assignment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GoogleStorageService } from '../google-storage/google-storage.service';
import { FileAssignmentRepository } from '../file-assignment/file-assignment.repository';

type AssignmentRepositoryType = {
  getById(request: RequestGetAssignmentById): Promise<Assignment>;
  getBySubjectId(
    request: RequestGetAssignmentBySubjectId,
  ): Promise<Assignment[]>;
  findMany(request: Prisma.AssignmentFindManyArgs): Promise<Assignment[]>;
  count(request: Prisma.AssignmentCountArgs): Promise<number>;
  create(request: Prisma.AssignmentCreateArgs): Promise<Assignment>;
  update(request: Prisma.AssignmentUpdateArgs): Promise<Assignment>;
  delete(request: RequestDeleteAssignment): Promise<{ message: string }>;
};
@Injectable()
export class AssignmentRepository implements AssignmentRepositoryType {
  logger: Logger = new Logger(AssignmentRepository.name);
  fileOnStudentAssignmentRepository: FileOnStudentAssignmentRepository =
    new FileOnStudentAssignmentRepository(
      this.prisma,
      this.googleStorageService,
    );
  fileAssignmentRepository: FileAssignmentRepository =
    new FileAssignmentRepository(this.prisma, this.googleStorageService);
  studentOnAssignmentRepository: StudentOnAssignmentRepository =
    new StudentOnAssignmentRepository(this.prisma);
  skillOnAssignmentRepository: SkillOnAssignmentRepository =
    new SkillOnAssignmentRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {}

  async getById(request: RequestGetAssignmentById): Promise<Assignment> {
    try {
      return await this.prisma.assignment.findUnique({
        where: {
          id: request.assignmentId,
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

  async findMany(
    request: Prisma.AssignmentFindManyArgs,
  ): Promise<Assignment[]> {
    try {
      return await this.prisma.assignment.findMany(request);
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

  async count(request: Prisma.AssignmentCountArgs): Promise<number> {
    try {
      return await this.prisma.assignment.count(request);
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
    request: RequestGetAssignmentBySubjectId,
  ): Promise<Assignment[]> {
    try {
      return await this.prisma.assignment.findMany({
        where: {
          subjectId: request.subjectId,
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

  async create(request: Prisma.AssignmentCreateArgs): Promise<Assignment> {
    try {
      return await this.prisma.assignment.create(request);
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

  async update(request: Prisma.AssignmentUpdateArgs): Promise<Assignment> {
    try {
      return await this.prisma.assignment.update(request);
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

  async delete(request: RequestDeleteAssignment): Promise<{ message: string }> {
    try {
      await this.fileAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await this.studentOnAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await this.fileOnStudentAssignmentRepository.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      await this.skillOnAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await this.prisma.assignment.delete({
        where: {
          id: request.assignmentId,
        },
      });

      return { message: 'Deleted Assignment Successfully' };
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
