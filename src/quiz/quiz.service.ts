import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Assignment, AssignmentOnQuiz } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { subjectScope } from '../cache/cache-scopes';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { isQuizLocked, QuizAccess } from './quiz-access';
import { toQuizBlank, toQuizOption, validateQuestionShape } from './question-shape';
import { withDefaultQuizSettings } from './quiz-settings';
import {
  CreateQuizQuestionDto,
  DuplicateQuizDto,
  ReorderQuizQuestionsDto,
  UpdateQuizQuestionDto,
} from './dto';

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private access: QuizAccess,
    private cache: CacheService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {}

  async getQuestions(assignmentId: string, user: UserJwtPayload): Promise<AssignmentOnQuiz[]> {
    await this.access.teacherAssignment(assignmentId, user);
    return this.prisma.assignmentOnQuiz.findMany({
      where: { assignmentId },
      orderBy: { order: 'asc' },
    });
  }

  async createQuestion(dto: CreateQuizQuestionDto, user: UserJwtPayload): Promise<AssignmentOnQuiz> {
    const assignment = await this.access.teacherAssignment(dto.assignmentId, user);
    await this.assertEditable(assignment);
    const shapeError = validateQuestionShape(dto);
    if (shapeError) throw new BadRequestException(shapeError);

    const last = await this.prisma.assignmentOnQuiz.findFirst({
      where: { assignmentId: assignment.id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const question = await this.prisma.assignmentOnQuiz.create({
      data: {
        order: (last?.order ?? -1) + 1,
        type: dto.type,
        prompt: dto.prompt,
        imageUrl: dto.imageUrl ?? null,
        points: dto.points,
        options: dto.options.map(toQuizOption),
        blanks: dto.blanks.map(toQuizBlank),
        assignmentId: assignment.id,
        subjectId: assignment.subjectId,
        schoolId: assignment.schoolId,
      },
    });
    await this.syncMaxScore(assignment);
    return question;
  }

  async updateQuestion(id: string, dto: UpdateQuizQuestionDto, user: UserJwtPayload): Promise<AssignmentOnQuiz> {
    const existing = await this.prisma.assignmentOnQuiz.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Question not found');
    const assignment = await this.access.teacherAssignment(existing.assignmentId, user);
    await this.assertEditable(assignment);

    const shapeError = validateQuestionShape({
      type: dto.type ?? existing.type,
      prompt: dto.prompt ?? existing.prompt,
      options: dto.options ?? existing.options,
      blanks: dto.blanks ?? existing.blanks,
    });
    if (shapeError) throw new BadRequestException(shapeError);

    const updated = await this.prisma.assignmentOnQuiz.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.prompt !== undefined && { prompt: dto.prompt }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.points !== undefined && { points: dto.points }),
        ...(dto.options !== undefined && { options: { set: dto.options.map(toQuizOption) } }),
        ...(dto.blanks !== undefined && { blanks: { set: dto.blanks.map(toQuizBlank) } }),
      },
    });
    if (dto.points !== undefined) await this.syncMaxScore(assignment);
    return updated;
  }

  async deleteQuestion(id: string, user: UserJwtPayload): Promise<AssignmentOnQuiz> {
    const existing = await this.prisma.assignmentOnQuiz.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Question not found');
    const assignment = await this.access.teacherAssignment(existing.assignmentId, user);
    await this.assertEditable(assignment);
    const deleted = await this.prisma.assignmentOnQuiz.delete({ where: { id } });
    await this.syncMaxScore(assignment);
    return deleted;
  }

  async reorder(assignmentId: string, dto: ReorderQuizQuestionsDto, user: UserJwtPayload): Promise<AssignmentOnQuiz[]> {
    const assignment = await this.access.teacherAssignment(assignmentId, user);
    await this.assertEditable(assignment);
    const existing = await this.prisma.assignmentOnQuiz.findMany({
      where: { assignmentId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((q) => q.id));
    const unique = new Set(dto.ids);
    if (
      unique.size !== dto.ids.length ||
      unique.size !== existingIds.size ||
      dto.ids.some((id) => !existingIds.has(id))
    ) {
      throw new BadRequestException('ids must contain every question of this quiz exactly once');
    }
    await Promise.all(
      dto.ids.map((id, index) =>
        this.prisma.assignmentOnQuiz.update({ where: { id }, data: { order: index } }),
      ),
    );
    return this.prisma.assignmentOnQuiz.findMany({ where: { assignmentId }, orderBy: { order: 'asc' } });
  }

  async duplicate(assignmentId: string, dto: DuplicateQuizDto, user: UserJwtPayload): Promise<Assignment> {
    const source = await this.access.teacherAssignment(assignmentId, user);
    const targetSubjectId = dto.targetSubjectId ?? source.subjectId;
    const sameSubject = targetSubjectId === source.subjectId;
    if (!sameSubject) {
      await this.teacherOnSubjectService.ValidateAccess({ userId: user.id, subjectId: targetSubjectId });
    }
    const subject = await this.prisma.subject.findUnique({ where: { id: targetSubjectId } });
    if (!subject) throw new NotFoundException('Subject not found');
    if (subject.isLocked) throw new ForbiddenException('Subject is locked. Cannot make any changes!');

    const questions = await this.prisma.assignmentOnQuiz.findMany({
      where: { assignmentId },
      orderBy: { order: 'asc' },
    });
    const assignAll = sameSubject
      ? (await this.prisma.studentOnAssignment.count({ where: { assignmentId, isAssigned: false } })) === 0
      : true;

    const copy = await this.prisma.assignment.create({
      data: {
        title: sameSubject ? `${source.title} (copy)` : source.title,
        description: source.description,
        type: 'Quiz',
        status: 'Draft',
        beginDate: new Date(),
        maxScore: source.maxScore,
        weight: source.weight,
        tags: source.tags,
        allowStudentViewScore: source.allowStudentViewScore,
        quizSettings: withDefaultQuizSettings(source.quizSettings),
        subjectId: targetSubjectId,
        schoolId: subject.schoolId,
        userId: user.id,
      },
    });

    if (questions.length > 0) {
      await this.prisma.assignmentOnQuiz.createMany({
        data: questions.map((q) => ({
          order: q.order,
          type: q.type,
          prompt: q.prompt,
          imageUrl: q.imageUrl,
          points: q.points,
          options: q.options,
          blanks: q.blanks,
          assignmentId: copy.id,
          subjectId: targetSubjectId,
          schoolId: subject.schoolId,
        })),
      });
    }

    const students = await this.prisma.studentOnSubject.findMany({ where: { subjectId: targetSubjectId } });
    if (students.length > 0) {
      await this.prisma.studentOnAssignment.createMany({
        data: students.map((s) => ({
          title: s.title,
          firstName: s.firstName,
          lastName: s.lastName,
          number: s.number,
          blurHash: s.blurHash,
          photo: s.photo,
          schoolId: s.schoolId,
          assignmentId: copy.id,
          studentId: s.studentId,
          studentOnSubjectId: s.id,
          subjectId: s.subjectId,
          isAssigned: assignAll,
        })),
      });
    }

    await this.cache.bump(
      subjectScope(targetSubjectId, 'assignments'),
      subjectScope(targetSubjectId, 'submissions'),
    );
    return copy;
  }

  private async assertEditable(assignment: Assignment): Promise<void> {
    const subject = await this.prisma.subject.findUnique({ where: { id: assignment.subjectId } });
    if (subject?.isLocked) throw new ForbiddenException('Subject is locked. Cannot make any changes!');
    if (await isQuizLocked(this.prisma, assignment.id)) throw new ConflictException('QUIZ_LOCKED');
  }

  private async syncMaxScore(assignment: Assignment): Promise<void> {
    const questions = await this.prisma.assignmentOnQuiz.findMany({
      where: { assignmentId: assignment.id },
      select: { points: true },
    });
    const maxScore = questions.reduce((total, q) => total + q.points, 0);
    await this.prisma.assignment.update({ where: { id: assignment.id }, data: { maxScore } });
    await this.cache.bump(
      subjectScope(assignment.subjectId, 'assignments'),
      subjectScope(assignment.subjectId, 'grades'),
    );
  }
}
