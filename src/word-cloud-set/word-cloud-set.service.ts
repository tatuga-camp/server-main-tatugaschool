import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StudentOnSubject, WordCloud, WordCloudSet } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { WordCount } from '../word-cloud/interfaces';
import { WordCloudSetRepository } from './word-cloud-set.repository';
import {
  AppendQuestionDto,
  CreateWordCloudSetDto,
  EditQuestionDto,
  GetWordCloudSetsBySubjectDto,
  SetIdParamDto,
  SetQuestionParamDto,
  UpdateWordCloudSetDto,
  WordCloudSetIdParamDto,
} from './dto';
import {
  ResponseGetWordCloudSetById,
  ResponseGetWordCloudSetPublic,
} from './interfaces';

@Injectable()
export class WordCloudSetService {
  private logger = new Logger(WordCloudSetService.name);
  private repository: WordCloudSetRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.repository = new WordCloudSetRepository(this.prisma);
  }

  private aggregate(
    answers: {
      text: string;
      normalized: string;
      studentOnSubjectId?: string | null;
    }[],
    nameById?: Map<string, string>,
  ): WordCount[] {
    const map = new Map<
      string,
      { text: string; normalized: string; count: number; names?: Set<string> }
    >();
    for (const a of answers) {
      let entry = map.get(a.normalized);
      if (!entry) {
        entry = { text: a.text, normalized: a.normalized, count: 0 };
        map.set(a.normalized, entry);
      }
      entry.count += 1;
      if (nameById && a.studentOnSubjectId) {
        const name = nameById.get(a.studentOnSubjectId);
        if (name) {
          if (!entry.names) entry.names = new Set();
          entry.names.add(name);
        }
      }
    }
    return [...map.values()]
      .map(({ names, ...rest }) =>
        names ? { ...rest, students: [...names] } : rest,
      )
      .sort((x, y) => y.count - x.count);
  }

  private async loadSetForTeacher(
    setId: string,
    user: UserJwtPayload,
  ): Promise<WordCloudSet> {
    const set = await this.repository.findUnique({ where: { id: setId } });
    if (!set) throw new NotFoundException('Word cloud set not found');
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: set.subjectId,
    });
    return set;
  }

  async create(
    dto: CreateWordCloudSetDto,
    user: UserJwtPayload,
  ): Promise<WordCloudSet> {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new NotFoundException('Subject not found');

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const accessMode = dto.accessMode ?? 'PUBLIC';
      const allowMultiple = dto.allowMultiple ?? false;

      const set = await this.repository.create({
        data: {
          title: dto.title,
          subjectId: dto.subjectId,
          schoolId: subject.schoolId,
          userId: user.id,
          accessMode,
          allowMultiple,
        },
      });

      if (dto.questions.length === 0) {
        throw new BadRequestException('A session needs at least one question');
      }

      const questions: WordCloud[] = [];
      for (let i = 0; i < dto.questions.length; i++) {
        const q = await this.repository.createQuestion({
          data: {
            question: dto.questions[i],
            order: i,
            subjectId: dto.subjectId,
            schoolId: subject.schoolId,
            userId: user.id,
            accessMode,
            allowMultiple,
            wordCloudSetId: set.id,
          },
        });
        questions.push(q);
      }

      return await this.repository.update({
        where: { id: set.id },
        data: { activeWordCloudId: questions[0].id },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findBySubject(
    dto: GetWordCloudSetsBySubjectDto,
    user: UserJwtPayload,
  ): Promise<WordCloudSet[]> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });
      return await this.repository.findMany({
        where: { subjectId: dto.subjectId },
        orderBy: { createAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getById(
    dto: WordCloudSetIdParamDto,
    user: UserJwtPayload,
  ): Promise<ResponseGetWordCloudSetById> {
    try {
      const set = await this.loadSetForTeacher(dto.setId, user);
      const questions = await this.repository.findManyQuestions({
        where: { wordCloudSetId: set.id },
        orderBy: { order: 'asc' },
      });

      const results = [];
      for (const q of questions) {
        const answers = await this.repository.findManyAnswers({
          where: { wordCloudId: q.id },
        });
        let nameById: Map<string, string> | undefined;
        if (q.accessMode === 'STUDENTS_ONLY') {
          const ids = [
            ...new Set(
              answers
                .map((a) => a.studentOnSubjectId)
                .filter((x): x is string => !!x),
            ),
          ];
          nameById = new Map();
          if (ids.length) {
            const students = await this.prisma.studentOnSubject.findMany({
              where: { id: { in: ids } },
            });
            for (const s of students) {
              nameById.set(s.id, `${s.firstName} ${s.lastName}`);
            }
          }
        }
        results.push({
          wordCloud: q,
          words: this.aggregate(answers, nameById),
          totalAnswers: answers.length,
        });
      }

      return { set, questions: results };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateWordCloudSetDto,
    user: UserJwtPayload,
  ): Promise<WordCloudSet> {
    try {
      const set = await this.loadSetForTeacher(dto.setId, user);

      const data: Record<string, unknown> = {};
      if (dto.title !== undefined) data.title = dto.title;
      if (dto.activeWordCloudId !== undefined)
        data.activeWordCloudId = dto.activeWordCloudId;
      if (dto.status !== undefined) data.status = dto.status;
      if (dto.accessMode !== undefined) data.accessMode = dto.accessMode;
      if (dto.allowMultiple !== undefined)
        data.allowMultiple = dto.allowMultiple;

      const updated = await this.repository.update({
        where: { id: set.id },
        data,
      });

      // Cascade status + shared settings to child questions so the existing
      // answer-submission endpoints (which check the child's own status) stay
      // correct without modification.
      const questionData: Record<string, unknown> = {};
      if (dto.status !== undefined) questionData.status = dto.status;
      if (dto.accessMode !== undefined) questionData.accessMode = dto.accessMode;
      if (dto.allowMultiple !== undefined)
        questionData.allowMultiple = dto.allowMultiple;
      if (Object.keys(questionData).length > 0) {
        await this.repository.updateManyQuestions({
          where: { wordCloudSetId: set.id },
          data: questionData,
        });
      }

      return updated;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async appendQuestion(
    param: SetIdParamDto,
    dto: AppendQuestionDto,
    user: UserJwtPayload,
  ): Promise<WordCloud> {
    try {
      const set = await this.loadSetForTeacher(param.setId, user);
      const questions = await this.repository.findManyQuestions({
        where: { wordCloudSetId: set.id },
        orderBy: { order: 'asc' },
      });
      const nextOrder =
        questions.length === 0
          ? 0
          : Math.max(...questions.map((q) => q.order)) + 1;

      return await this.repository.createQuestion({
        data: {
          question: dto.question,
          order: nextOrder,
          subjectId: set.subjectId,
          schoolId: set.schoolId,
          userId: set.userId,
          accessMode: set.accessMode,
          allowMultiple: set.allowMultiple,
          status: set.status,
          wordCloudSetId: set.id,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async loadEditableQuestion(
    param: SetQuestionParamDto,
    user: UserJwtPayload,
  ): Promise<WordCloud> {
    const set = await this.loadSetForTeacher(param.setId, user);
    const question = await this.repository.findUniqueQuestion({
      where: { id: param.wordCloudId },
    });
    if (!question || question.wordCloudSetId !== set.id) {
      throw new NotFoundException('Question not found in this set');
    }
    const answerCount = await this.repository.countAnswers({
      where: { wordCloudId: question.id },
    });
    if (answerCount > 0) {
      throw new BadRequestException(
        'Cannot modify a question that already has answers',
      );
    }
    return question;
  }

  async editQuestion(
    param: SetQuestionParamDto,
    dto: EditQuestionDto,
    user: UserJwtPayload,
  ): Promise<WordCloud> {
    try {
      const question = await this.loadEditableQuestion(param, user);
      return await this.repository.updateQuestion({
        where: { id: question.id },
        data: { question: dto.question },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteQuestion(
    param: SetQuestionParamDto,
    user: UserJwtPayload,
  ): Promise<WordCloud> {
    try {
      const question = await this.loadEditableQuestion(param, user);
      return await this.repository.deleteQuestion(question.id);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteSet(
    param: WordCloudSetIdParamDto,
    user: UserJwtPayload,
  ): Promise<WordCloudSet> {
    try {
      const set = await this.loadSetForTeacher(param.setId, user);
      return await this.repository.deleteSet(set.id);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getPublic(
    param: WordCloudSetIdParamDto,
  ): Promise<ResponseGetWordCloudSetPublic> {
    try {
      const set = await this.repository.findUnique({
        where: { id: param.setId },
      });
      if (!set) throw new NotFoundException('Word cloud set not found');

      const questions = await this.repository.findManyQuestions({
        where: { wordCloudSetId: set.id },
        orderBy: { order: 'asc' },
      });

      const activeOrder =
        questions.find((q) => q.id === set.activeWordCloudId)?.order ?? 0;
      const revealed = questions.filter((q) => q.order <= activeOrder);

      let students: StudentOnSubject[] = [];
      if (set.accessMode === 'STUDENTS_ONLY') {
        students = await this.prisma.studentOnSubject.findMany({
          where: { subjectId: set.subjectId, isActive: true },
        });
      }

      return {
        id: set.id,
        status: set.status,
        accessMode: set.accessMode,
        allowMultiple: set.allowMultiple,
        subjectId: set.subjectId,
        activeWordCloudId: set.activeWordCloudId,
        questions: revealed.map((q) => ({
          id: q.id,
          question: q.question,
          order: q.order,
          status: q.status,
        })),
        students,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
