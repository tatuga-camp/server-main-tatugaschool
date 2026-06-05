import {
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
import {
  CreateRubricDto,
  GetRubricsBySubjectDto,
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
}
