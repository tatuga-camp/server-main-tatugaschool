import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StudentOnSubject, WordCloud } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';
import { WordCloudRepository } from './word-cloud.repository';
import {
  AnswerWordCloudDto,
  CreateWordCloudDto,
  DeleteWordCloudDto,
  GetWordCloudByIdDto,
  GetWordCloudsBySubjectDto,
  UpdateWordCloudDto,
  WordCloudIdParamDto,
} from './dto';
import {
  ResponseGetWordCloudById,
  ResponseGetWordCloudPublic,
  WordCount,
} from './interfaces';

@Injectable()
export class WordCloudService {
  private logger = new Logger(WordCloudService.name);
  wordCloudRepository: WordCloudRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.wordCloudRepository = new WordCloudRepository(this.prisma);
  }

  private normalize(text: string): string {
    return text.trim().toLowerCase();
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

  async create(
    dto: CreateWordCloudDto,
    user: UserJwtPayload,
  ): Promise<WordCloud> {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });
      if (!subject) throw new NotFoundException('Subject not found');

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.wordCloudRepository.create({
        data: {
          question: dto.question,
          subjectId: dto.subjectId,
          schoolId: subject.schoolId,
          userId: user.id,
          accessMode: dto.accessMode ?? 'PUBLIC',
          allowMultiple: dto.allowMultiple ?? false,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async findBySubject(
    dto: GetWordCloudsBySubjectDto,
    user: UserJwtPayload,
  ): Promise<WordCloud[]> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });
      return await this.wordCloudRepository.findMany({
        where: { subjectId: dto.subjectId },
        orderBy: { createAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getById(
    dto: GetWordCloudByIdDto,
    user: UserJwtPayload,
  ): Promise<ResponseGetWordCloudById> {
    try {
      const wordCloud = await this.wordCloudRepository.findUnique({
        where: { id: dto.wordCloudId },
      });
      if (!wordCloud) throw new NotFoundException('Word cloud not found');

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: wordCloud.subjectId,
      });

      const answers = await this.wordCloudRepository.findManyAnswers({
        where: { wordCloudId: wordCloud.id },
      });

      let nameById: Map<string, string> | undefined;
      if (wordCloud.accessMode === 'STUDENTS_ONLY') {
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

      return {
        wordCloud,
        words: this.aggregate(answers, nameById),
        totalAnswers: answers.length,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateWordCloudDto,
    user: UserJwtPayload,
  ): Promise<WordCloud> {
    try {
      const wordCloud = await this.wordCloudRepository.findUnique({
        where: { id: dto.query.wordCloudId },
      });
      if (!wordCloud) throw new NotFoundException('Word cloud not found');

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: wordCloud.subjectId,
      });

      return await this.wordCloudRepository.update({
        where: { id: dto.query.wordCloudId },
        data: { ...dto.body },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteWordCloudDto,
    user: UserJwtPayload,
  ): Promise<WordCloud> {
    try {
      const wordCloud = await this.wordCloudRepository.findUnique({
        where: { id: dto.wordCloudId },
      });
      if (!wordCloud) throw new NotFoundException('Word cloud not found');

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: wordCloud.subjectId,
      });

      return await this.wordCloudRepository.delete({
        wordCloudId: dto.wordCloudId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getPublic(
    param: WordCloudIdParamDto,
  ): Promise<ResponseGetWordCloudPublic> {
    try {
      const wordCloud = await this.wordCloudRepository.findUnique({
        where: { id: param.wordCloudId },
      });
      if (!wordCloud) throw new NotFoundException('Word cloud not found');

      // For STUDENTS_ONLY clouds, expose the subject roster so the student can
      // pick their profile before signing in (mirrors the QR-attendance flow).
      let students: StudentOnSubject[] = [];
      if (wordCloud.accessMode === 'STUDENTS_ONLY') {
        students = await this.prisma.studentOnSubject.findMany({
          where: { subjectId: wordCloud.subjectId, isActive: true },
        });
      }

      return {
        id: wordCloud.id,
        question: wordCloud.question,
        status: wordCloud.status,
        accessMode: wordCloud.accessMode,
        allowMultiple: wordCloud.allowMultiple,
        students,
        subjectId: wordCloud.subjectId,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async loadOpenWordCloud(
    wordCloudId: string,
    expectedAccess: 'PUBLIC' | 'STUDENTS_ONLY',
  ): Promise<WordCloud> {
    const wordCloud = await this.wordCloudRepository.findUnique({
      where: { id: wordCloudId },
    });
    if (!wordCloud) throw new NotFoundException('Word cloud not found');
    if (wordCloud.accessMode !== expectedAccess) {
      throw new ForbiddenException('Wrong access mode for this word cloud');
    }
    if (wordCloud.status !== 'OPEN') {
      throw new BadRequestException('This word cloud is closed');
    }
    return wordCloud;
  }

  private async enforceBrowserLimit(
    wordCloud: WordCloud,
    browserToken: string,
  ): Promise<void> {
    if (wordCloud.allowMultiple) return;
    const count = await this.wordCloudRepository.countAnswers({
      where: { wordCloudId: wordCloud.id, browserToken },
    });
    if (count > 0) {
      throw new BadRequestException(
        'Only one answer is allowed per browser for this word cloud',
      );
    }
  }

  async submitPublic(param: WordCloudIdParamDto, dto: AnswerWordCloudDto) {
    try {
      const wordCloud = await this.loadOpenWordCloud(
        param.wordCloudId,
        'PUBLIC',
      );
      const normalized = this.normalize(dto.text);
      if (!normalized) throw new BadRequestException('Answer cannot be empty');
      await this.enforceBrowserLimit(wordCloud, dto.browserToken);
      return await this.wordCloudRepository.createAnswer({
        data: {
          text: dto.text,
          normalized,
          browserToken: dto.browserToken,
          wordCloudId: wordCloud.id,
          subjectId: wordCloud.subjectId,
          schoolId: wordCloud.schoolId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async submitStudent(
    param: WordCloudIdParamDto,
    dto: AnswerWordCloudDto,
    student: StudentJwtPayload,
  ) {
    try {
      const wordCloud = await this.loadOpenWordCloud(
        param.wordCloudId,
        'STUDENTS_ONLY',
      );
      const enrolled = await this.prisma.studentOnSubject.findFirst({
        where: { studentId: student.id, subjectId: wordCloud.subjectId },
      });
      if (!enrolled) {
        throw new ForbiddenException('You are not enrolled in this subject');
      }
      const normalized = this.normalize(dto.text);
      if (!normalized) throw new BadRequestException('Answer cannot be empty');
      await this.enforceBrowserLimit(wordCloud, dto.browserToken);
      return await this.wordCloudRepository.createAnswer({
        data: {
          text: dto.text,
          normalized,
          browserToken: dto.browserToken,
          wordCloudId: wordCloud.id,
          subjectId: wordCloud.subjectId,
          schoolId: wordCloud.schoolId,
          studentId: student.id,
          studentOnSubjectId: enrolled.id,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
