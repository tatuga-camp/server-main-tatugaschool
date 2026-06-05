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

  // Delete a rubric's criteria + levels, but keep the rubric row (used by update).
  async deleteCriteriaTree(rubricId: string): Promise<void> {
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
    } catch (e) {
      this.handle(e);
    }
  }

  // Delete the whole rubric including its criteria + levels (used by delete).
  async deleteCascade(rubricId: string): Promise<void> {
    try {
      await this.deleteCriteriaTree(rubricId);
      await this.prisma.rubric.delete({ where: { id: rubricId } });
    } catch (e) {
      this.handle(e);
    }
  }

  // Update the rubric row and (re)create its criteria subtree.
  async updateRubricWithCriteria(
    rubricId: string,
    data: Prisma.RubricUpdateInput,
  ): Promise<Rubric> {
    try {
      return await this.prisma.rubric.update({ where: { id: rubricId }, data });
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
}
