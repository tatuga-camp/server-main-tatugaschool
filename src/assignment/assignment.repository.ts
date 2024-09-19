import { SkillOnAssignmentRepository } from './../skill-on-assignment/skill-on-assignment.repository';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { FileOnStudentAssignmentRepository } from './../file-on-student-assignment/file-on-student-assignment.repository';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  RequestCreateAssignment,
  RequestDeleteAssignment,
  RequestGetAssignmentById,
  RequestGetAssignmentBySubjectId,
  RequestUpdateAssignment,
} from './interfaces';
import { Assignment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GoogleStorageService } from '../google-storage/google-storage.service';
import { FileAssignmentRepository } from '../file-assignment/file-assignment.repository';

type AssignmentRepositoryType = {
  getAssignmentById(request: RequestGetAssignmentById): Promise<Assignment>;
  getAssignmentBySubjectId(
    request: RequestGetAssignmentBySubjectId,
  ): Promise<Assignment[]>;
  createAssignment(request: RequestCreateAssignment): Promise<Assignment>;
  updateAssignment(request: RequestUpdateAssignment): Promise<Assignment>;
  deleteAssignment(
    request: RequestDeleteAssignment,
  ): Promise<{ message: string }>;
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

  async getAssignmentById(
    request: RequestGetAssignmentById,
  ): Promise<Assignment> {
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

  async getAssignmentBySubjectId(
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

  async createAssignment(
    request: RequestCreateAssignment,
  ): Promise<Assignment> {
    try {
      return await this.prisma.assignment.create({
        data: request,
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

  async updateAssignment(
    request: RequestUpdateAssignment,
  ): Promise<Assignment> {
    try {
      return await this.prisma.assignment.update({
        where: {
          id: request.query.assignmentId,
        },
        data: request.data,
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

  async deleteAssignment(
    request: RequestDeleteAssignment,
  ): Promise<{ message: string }> {
    try {
      await this.fileAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await this.studentOnAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await this.fileOnStudentAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
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
