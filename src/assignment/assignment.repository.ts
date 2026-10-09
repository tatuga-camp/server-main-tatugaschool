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
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';

// Each embedding is ~10–12 KB on the wire; only vector search needs it.
const OMIT_EMBEDDING = {
  vector: true,
  vectorResouce: true,
} satisfies Prisma.AssignmentOmit;

function withEmbeddingOmitted<T extends { select?: unknown; omit?: unknown }>(
  request: T,
): T {
  if (request.select || request.omit) {
    return request;
  }
  return { ...request, omit: OMIT_EMBEDDING };
}

// Deleted assignments are hidden from every read unless a hard-delete path
// asks for them explicitly.
function liveWhere<T extends { where?: object }>(
  args: T,
  includeDeleted?: boolean,
): T {
  if (includeDeleted) return args;
  return { ...args, where: { ...(args.where ?? {}), isDeleted: false } };
}

export type AssignmentReadOptions = { includeDeleted?: boolean };

type AssignmentRepositoryType = {
  getById(
    request: RequestGetAssignmentById & AssignmentReadOptions,
  ): Promise<Assignment>;
  findMany(
    request: Prisma.AssignmentFindManyArgs,
    opts?: AssignmentReadOptions,
  ): Promise<Assignment[]>;
  count(
    request: Prisma.AssignmentCountArgs,
    opts?: AssignmentReadOptions,
  ): Promise<number>;
  softDelete(assignmentId: string): Promise<Assignment>;
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
    private cache: CacheService,
  ) {
    this.skillOnAssignmentRepository = new SkillOnAssignmentRepository(
      this.prisma,
      this.cache,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
      this.cache,
    );
    this.fileAssignmentRepository = new FileAssignmentRepository(
      this.prisma,
      this.storageService,
      this.cache,
    );
    this.fileOnStudentAssignmentRepository =
      new FileOnStudentAssignmentRepository(
        this.prisma,
        this.storageService,
        this.cache,
      );
  }

  async getById(
    request: RequestGetAssignmentById & AssignmentReadOptions,
  ): Promise<Assignment> {
    try {
      const args: Prisma.AssignmentFindUniqueArgs = {
        where: {
          id: request.assignmentId,
          ...(request.includeDeleted ? {} : { isDeleted: false }),
        },
        ...(!request.withVector && { omit: OMIT_EMBEDDING }),
      };
      // includes-deleted: only with request.includeDeleted; args filters by default
      return await this.prisma.assignment.findUnique(args);
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
    opts?: AssignmentReadOptions,
  ): Promise<Assignment[]> {
    try {
      request = liveWhere(withEmbeddingOmitted(request), opts?.includeDeleted);
      // includes-deleted: only with opts.includeDeleted; liveWhere filters by default
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

  async count(
    request: Prisma.AssignmentCountArgs,
    opts?: AssignmentReadOptions,
  ): Promise<number> {
    try {
      // includes-deleted: only with opts.includeDeleted; liveWhere filters by default
      return await this.prisma.assignment.count(
        liveWhere(request, opts?.includeDeleted),
      );
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
      const result = await this.prisma.assignment.create(request);
      await this.cache.bump(subjectScope(result.subjectId, 'assignments'));

      return result;
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
      const result = await this.prisma.assignment.update(
        withEmbeddingOmitted(request),
      );
      await this.cache.bump(subjectScope(result.subjectId, 'assignments'));

      return result;
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

  async softDelete(assignmentId: string): Promise<Assignment> {
    try {
      const args: Prisma.AssignmentUpdateArgs = {
        where: { id: assignmentId },
        data: { isDeleted: true, deletedAt: new Date() },
        omit: OMIT_EMBEDDING,
      };
      const result = await this.prisma.assignment.update(args);
      await this.cache.bump(
        subjectScope(result.subjectId, 'assignments'),
        subjectScope(result.subjectId, 'submissions'),
      );
      return result;
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
      // includes-deleted: hard delete
      const ref = await this.prisma.assignment.findUnique({
        where: { id: request.assignmentId },
        select: { subjectId: true },
      });

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

      const studentOnAssignmentIds = studentOnAssignments.map((s) => s.id);
      if (studentOnAssignmentIds.length > 0) {
        // 🚀 3. PARALLEL DELETES + IN OPERATOR:
        // Run both queries at the same time using the highly optimized 'in' operator
        await Promise.all([
          this.prisma.skillOnStudentAssignment.deleteMany({
            where: {
              studentOnAssignmentId: { in: studentOnAssignmentIds },
            },
          }),
          this.prisma.commentOnAssignment.deleteMany({
            where: {
              studentOnAssignmentId: { in: studentOnAssignmentIds },
            },
          }),
          // Rubric grade rows hold a required relation to studentOnAssignment;
          // remove them before the studentOnAssignments are deleted (else P2014).
          this.prisma.rubricScoreOnStudentAssignment.deleteMany({
            where: {
              studentOnAssignmentId: { in: studentOnAssignmentIds },
            },
          }),
        ]);
      }

      // Quiz rows: answers and events reference questions and student work,
      // so delete them before their parents.
      await Promise.all([
        this.prisma.studentOnQuiz.deleteMany({
          where: { assignmentId: request.assignmentId },
        }),
        this.prisma.quizIntegrityEvent.deleteMany({
          where: { assignmentId: request.assignmentId },
        }),
      ]);
      await this.prisma.assignmentOnQuiz.deleteMany({
        where: { assignmentId: request.assignmentId },
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
        subjectId: ref.subjectId,
      });

      await this.studentOnAssignmentRepository.deleteByAssignmentId({
        assignmentId: request.assignmentId,
        subjectId: ref.subjectId,
      });

      const assignment = await this.prisma.assignment.delete({
        where: {
          id: request.assignmentId,
        },
      });

      const result = {
        message: 'Deleted Assignment Successfully',
        totalDeleteSize: totalDeleteSize,
      };

      await this.cache.bump(
        subjectScope(assignment.subjectId, 'assignments'),
        subjectScope(assignment.subjectId, 'submissions'),
      );

      return result;
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
