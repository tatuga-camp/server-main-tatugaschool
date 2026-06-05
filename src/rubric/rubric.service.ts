import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Rubric } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { AiService } from '../ai/ai.service';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { RubricRepository } from './rubric.repository';
import { computeRubricScore } from './rubric-math';
import {
  CreateRubricDto,
  GetRubricsBySubjectDto,
  GradeRubricDto,
  RubricIdParamDto,
  UpdateRubricDto,
} from './dto';

@Injectable()
export class RubricService {
  repo: RubricRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private ai: AiService,
  ) {
    this.repo = new RubricRepository(this.prisma);
  }

  private buildCriteriaCreate(criteria: CreateRubricDto['criteria']) {
    return {
      create: criteria.map((c) => ({
        title: c.title,
        description: c.description,
        weight: c.weight,
        order: c.order,
        levels: {
          create: c.levels.map((l) => ({
            title: l.title,
            description: l.description,
            points: l.points,
            order: l.order,
          })),
        },
      })),
    };
  }

  async create(dto: CreateRubricDto, user: UserJwtPayload): Promise<Rubric> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: dto.subjectId,
    });
    return this.repo.createFull({
      data: {
        title: dto.title,
        description: dto.description,
        subjectId: dto.subjectId,
        schoolId: subject.schoolId,
        userId: user.id,
        criteria: this.buildCriteriaCreate(dto.criteria),
      },
    });
  }

  async findBySubject(dto: GetRubricsBySubjectDto, user: UserJwtPayload) {
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: dto.subjectId,
    });
    return this.repo.findManyBySubject(dto.subjectId);
  }

  async getById(dto: RubricIdParamDto, user: UserJwtPayload) {
    const rubric = await this.repo.findByIdWithTree(dto.rubricId);
    if (!rubric) throw new NotFoundException('Rubric not found');
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: rubric.subjectId,
    });
    return rubric;
  }

  async update(dto: UpdateRubricDto, user: UserJwtPayload): Promise<Rubric> {
    const existing = await this.repo.findByIdWithTree(dto.rubricId);
    if (!existing) throw new NotFoundException('Rubric not found');
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: existing.subjectId,
    });
    // Keep the same rubric id; atomically replace its criteria/levels from the dto.
    return this.repo.replaceCriteria(dto.rubricId, {
      title: dto.title,
      description: dto.description,
      criteria: this.buildCriteriaCreate(dto.criteria),
    });
  }

  async delete(
    dto: RubricIdParamDto,
    user: UserJwtPayload,
  ): Promise<{ id: string }> {
    const rubric = await this.repo.findByIdWithTree(dto.rubricId);
    if (!rubric) throw new NotFoundException('Rubric not found');
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: rubric.subjectId,
    });
    const used = await this.repo.countAssignmentsUsing(dto.rubricId);
    if (used > 0) {
      throw new ForbiddenException(
        'Detach this rubric from all assignments before deleting it.',
      );
    }
    await this.repo.deleteCascade(dto.rubricId);
    return { id: dto.rubricId };
  }

  private async loadAssignmentRubric(assignmentId: string) {
    const loaded = await this.repo.findAssignmentRubric(assignmentId);
    if (!loaded) return null;
    return {
      maxScore: loaded.maxScore,
      criteria: loaded.rubric.criteria.map((c) => ({
        id: c.id,
        weight: c.weight,
        levels: c.levels.map((l) => ({ id: l.id, points: l.points })),
      })),
    };
  }

  async gradeStudent(dto: GradeRubricDto, user: UserJwtPayload) {
    const soa = await this.repo.getStudentOnAssignment(
      dto.studentOnAssignmentId,
    );
    if (!soa) throw new NotFoundException('Student assignment not found');
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: soa.subjectId,
    });

    const loaded = await this.loadAssignmentRubric(soa.assignmentId);
    if (!loaded) {
      throw new BadRequestException('This assignment has no rubric attached.');
    }

    const criterionIds = dto.items.map((i) => i.criterionId);
    if (new Set(criterionIds).size !== criterionIds.length) {
      throw new BadRequestException('Duplicate criterionId in items.');
    }

    const resolved = dto.items.map((item) => {
      const criterion = loaded.criteria.find((c) => c.id === item.criterionId);
      if (!criterion) {
        throw new BadRequestException(
          `Criterion ${item.criterionId} is not part of this assignment's rubric.`,
        );
      }
      const level = criterion.levels.find((l) => l.id === item.selectedLevelId);
      if (!level) {
        throw new BadRequestException(
          `Level ${item.selectedLevelId} is not part of criterion ${item.criterionId}.`,
        );
      }
      return {
        criterionId: item.criterionId,
        selectedLevelId: item.selectedLevelId,
        comment: item.comment,
        points: level.points,
        weight: criterion.weight,
      };
    });

    const score = computeRubricScore({
      criteria: loaded.criteria.map((c) => ({
        weight: c.weight,
        maxPoints: Math.max(0, ...c.levels.map((l) => l.points)),
      })),
      selections: resolved.map((r) => ({ points: r.points, weight: r.weight })),
      maxScore: loaded.maxScore,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.rubricScoreOnStudentAssignment.deleteMany({
        where: { studentOnAssignmentId: dto.studentOnAssignmentId },
      });
      for (const r of resolved) {
        await tx.rubricScoreOnStudentAssignment.create({
          data: {
            studentOnAssignmentId: dto.studentOnAssignmentId,
            criterionId: r.criterionId,
            selectedLevelId: r.selectedLevelId,
            comment: r.comment,
            points: r.points,
            subjectId: soa.subjectId,
            schoolId: soa.schoolId,
          },
        });
      }
      await tx.studentOnAssignment.update({
        where: { id: dto.studentOnAssignmentId },
        data: { score, status: 'REVIEWD', reviewdAt: new Date() },
      });
    });

    return { studentOnAssignmentId: dto.studentOnAssignmentId, score };
  }
}
