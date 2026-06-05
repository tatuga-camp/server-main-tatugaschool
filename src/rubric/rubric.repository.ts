import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  Rubric,
  RubricScoreOnStudentAssignment,
  StudentOnAssignment,
} from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RubricRepository {
  private logger = new Logger(RubricRepository.name);
  constructor(private prisma: PrismaService) {}

  private handle(error: unknown): never {
    this.logger.error(error);
    if (error instanceof PrismaClientKnownRequestError) {
      throw new InternalServerErrorException(
        `message: ${error.message} - codeError: ${error.code}`,
      );
    }
    throw error;
  }

  async createFull(request: Prisma.RubricCreateArgs): Promise<Rubric> {
    try {
      return await this.prisma.rubric.create(request);
    } catch (e) {
      this.handle(e);
    }
  }

  async findManyBySubject(subjectId: string): Promise<Rubric[]> {
    try {
      return await this.prisma.rubric.findMany({
        where: { subjectId },
        orderBy: { createAt: 'desc' },
      });
    } catch (e) {
      this.handle(e);
    }
  }

  async findByIdWithTree(rubricId: string) {
    try {
      return await this.prisma.rubric.findUnique({
        where: { id: rubricId },
        include: {
          criteria: {
            orderBy: { order: 'asc' },
            include: { levels: { orderBy: { order: 'asc' } } },
          },
        },
      });
    } catch (e) {
      this.handle(e);
    }
  }

  async countAssignmentsUsing(rubricId: string): Promise<number> {
    try {
      return await this.prisma.assignment.count({ where: { rubricId } });
    } catch (e) {
      this.handle(e);
    }
  }

  // Delete the whole rubric including its criteria + levels (used by delete).
  async deleteCascade(rubricId: string): Promise<void> {
    try {
      const criteria = await this.prisma.rubricCriterion.findMany({
        where: { rubricId },
        select: { id: true },
      });
      const ids = criteria.map((c) => c.id);
      await this.prisma.rubricLevel.deleteMany({
        where: { criterionId: { in: ids } },
      });
      await this.prisma.rubricCriterion.deleteMany({ where: { rubricId } });
      await this.prisma.rubric.delete({ where: { id: rubricId } });
    } catch (e) {
      this.handle(e);
    }
  }

  // Atomically replace a rubric's criteria/levels subtree and update the row.
  // Wraps delete + recreate in a single transaction so a failure can't leave
  // the rubric with its criteria wiped (used by update).
  async replaceCriteria(
    rubricId: string,
    data: Prisma.RubricUpdateInput,
  ): Promise<Rubric> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const criteria = await tx.rubricCriterion.findMany({
          where: { rubricId },
          select: { id: true },
        });
        const ids = criteria.map((c) => c.id);
        await tx.rubricLevel.deleteMany({
          where: { criterionId: { in: ids } },
        });
        await tx.rubricCriterion.deleteMany({ where: { rubricId } });
        return tx.rubric.update({ where: { id: rubricId }, data });
      });
    } catch (e) {
      this.handle(e);
    }
  }

  async findScoresByStudentOnAssignment(
    studentOnAssignmentId: string,
  ): Promise<RubricScoreOnStudentAssignment[]> {
    try {
      return await this.prisma.rubricScoreOnStudentAssignment.findMany({
        where: { studentOnAssignmentId },
      });
    } catch (e) {
      this.handle(e);
    }
  }

  async getStudentOnAssignment(
    id: string,
  ): Promise<StudentOnAssignment | null> {
    try {
      return await this.prisma.studentOnAssignment.findUnique({
        where: { id },
      });
    } catch (e) {
      this.handle(e);
    }
  }

  async findBreakdown(studentOnAssignmentId: string) {
    try {
      const soa = await this.prisma.studentOnAssignment.findUnique({
        where: { id: studentOnAssignmentId },
        select: {
          id: true,
          studentId: true,
          subjectId: true,
          score: true,
          assignment: {
            select: {
              id: true,
              maxScore: true,
              rubric: {
                include: {
                  criteria: {
                    orderBy: { order: 'asc' },
                    include: { levels: { orderBy: { order: 'asc' } } },
                  },
                },
              },
            },
          },
        },
      });
      if (!soa) return null;
      const scores = await this.prisma.rubricScoreOnStudentAssignment.findMany({
        where: { studentOnAssignmentId },
      });
      return { soa, scores };
    } catch (e) {
      this.handle(e);
    }
  }

  async findAssignmentRubric(assignmentId: string) {
    try {
      const assignment = await this.prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { maxScore: true, rubricId: true },
      });
      if (!assignment?.rubricId) return null;
      const rubric = await this.prisma.rubric.findUnique({
        where: { id: assignment.rubricId },
        include: { criteria: { include: { levels: true } } },
      });
      return rubric ? { maxScore: assignment.maxScore, rubric } : null;
    } catch (e) {
      this.handle(e);
    }
  }
}
