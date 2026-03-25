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
import { StorageService } from '../storage/storage.service';
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
  delete(
    request: RequestDeleteAssignment,
  ): Promise<{ message: string; totalDeleteSize: number }>;
};
@Injectable()
export class AssignmentRepository implements AssignmentRepositoryType {
  logger: Logger = new Logger(AssignmentRepository.name);
  fileOnStudentAssignmentRepository: FileOnStudentAssignmentRepository;
  fileAssignmentRepository: FileAssignmentRepository;
  studentOnAssignmentRepository: StudentOnAssignmentRepository;
  skillOnAssignmentRepository: SkillOnAssignmentRepository;
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {
    this.skillOnAssignmentRepository = new SkillOnAssignmentRepository(
      this.prisma,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.fileAssignmentRepository = new FileAssignmentRepository(
      this.prisma,
      this.storageService,
    );
    this.fileOnStudentAssignmentRepository =
      new FileOnStudentAssignmentRepository(this.prisma, this.storageService);
  }

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

  async getTotalDeleteSize(request: { assignmentId: string }): Promise<number> {
    try {
      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany({
          where: {
            assignmentId: request.assignmentId,
          },
        });

      const fileOnAssignments = await this.fileAssignmentRepository.findMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      const totalDeleteSize = [
        ...fileOnAssignments,
        ...fileOnStudentAssignments.filter((t) => t.contentType === 'FILE'),
      ].reduce((prev, current) => prev + current.size, 0);

      return totalDeleteSize;
    } catch (error) {
      throw error;
    }
  }

  async delete(
    request: RequestDeleteAssignment,
  ): Promise<{ message: string; totalDeleteSize: number }> {
    try {
      const totalDeleteSize = await this.getTotalDeleteSize({
        assignmentId: request.assignmentId,
      });

      const files = await this.fileAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await Promise.allSettled(
        files.map((f) =>
          this.storageService.DeleteFileOnStorage({ fileName: f.url }),
        ),
      );

      const studentOnAssignments =
        await this.studentOnAssignmentRepository.findMany({
          where: {
            assignmentId: request.assignmentId,
          },
        });

      await this.prisma.skillOnStudentAssignment.deleteMany({
        where: {
          OR: studentOnAssignments.map((s) => {
            return {
              studentOnAssignmentId: s.id,
            };
          }),
        },
      });

      await this.prisma.commentOnAssignment.deleteMany({
        where: {
          OR: studentOnAssignments.map((s) => {
            return {
              studentOnAssignmentId: s.id,
            };
          }),
        },
      });

      await this.prisma.questionOnVideo.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });
      const fileOnStudentAssignments =
        await this.prisma.fileOnStudentAssignment.findMany({
          where: {
            assignmentId: request.assignmentId,
          },
        });

      await Promise.allSettled(
        fileOnStudentAssignments
          .filter((f) => f.contentType === 'FILE')
          .map((f) =>
            this.storageService.DeleteFileOnStorage({ fileName: f.body }),
          ),
      );

      await this.fileOnStudentAssignmentRepository.deleteMany({
        where: {
          assignmentId: request.assignmentId,
        },
      });

      await this.skillOnAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await this.studentOnAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
      });

      await this.prisma.assignment.delete({
        where: {
          id: request.assignmentId,
        },
      });

      return {
        message: 'Deleted Assignment Successfully',
        totalDeleteSize: totalDeleteSize,
      };
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
