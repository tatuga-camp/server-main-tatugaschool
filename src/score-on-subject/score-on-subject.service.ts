import { GoogleStorageService } from './../google-storage/google-storage.service';
import { ScoreOnSubjectRepository } from './score-on-subject.repository';
import {
  Injectable,
  Logger,
  Get,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateScoreOnSubjectDto,
  GetAllScoreOnSubjectBySujectIdDto,
  UpdateScoreOnSubjectDto,
} from './dto';
import { ScoreOnSubject, User } from '@prisma/client';
import { SubjectRepository } from '../subject/subject.repository';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Injectable()
export class ScoreOnSubjectService {
  logger: Logger = new Logger(ScoreOnSubjectService.name);
  scoreOnSubjectRepository: ScoreOnSubjectRepository;
  subjectRepository: SubjectRepository;

  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.subjectRepository = new SubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.scoreOnSubjectRepository = new ScoreOnSubjectRepository(this.prisma);
  }

  async GetAllScoreOnSubjectBySubjectId(
    dto: GetAllScoreOnSubjectBySujectIdDto,
    user: User,
  ): Promise<ScoreOnSubject[]> {
    try {
      const subject = await this.subjectRepository.getSubjectById({
        subjectId: dto.subjectId,
      });

      if (!subject) {
        throw new NotFoundException(
          `Subject with id ${dto.subjectId} not found`,
        );
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.scoreOnSubjectRepository.findMany({
        where: {
          subjectId: dto.subjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createScoreOnSubject(
    dto: CreateScoreOnSubjectDto,
    user: User,
  ): Promise<ScoreOnSubject> {
    try {
      const subject = await this.subjectRepository.getSubjectById({
        subjectId: dto.subjectId,
      });

      if (!subject) {
        throw new NotFoundException(
          `Subject with id ${dto.subjectId} not found`,
        );
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.scoreOnSubjectRepository.createSocreOnSubject({
        ...dto,
        schoolId: subject.schoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateScoreOnSubject(
    dto: UpdateScoreOnSubjectDto,
    user: User,
  ): Promise<ScoreOnSubject> {
    try {
      if (dto.body.icon && !dto.body.blurHash) {
        throw new BadRequestException('BlurHash is required for icon');
      }

      if (dto.body.weight && !dto.body.maxScore) {
        throw new BadRequestException('Max Score is required for weight');
      }
      const scoreOnSubject = await this.prisma.scoreOnSubject.findUnique({
        where: {
          id: dto.query.socreOnSubjectId,
        },
      });
      const subject = await this.subjectRepository.getSubjectById({
        subjectId: scoreOnSubject.subjectId,
      });

      if (!subject) {
        throw new NotFoundException(
          'Subject with id ${scoreOnSubject.subjectId} not found',
        );
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: subject.id,
      });

      return await this.scoreOnSubjectRepository.updateScoreOnSubject({
        query: {
          scoreOnSubjectId: dto.query.socreOnSubjectId,
        },
        body: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(dto: { scoreOnSubjectId: string }, user: User) {
    try {
      const scoreOnSubject = await this.scoreOnSubjectRepository.findUnique({
        where: {
          id: dto.scoreOnSubjectId,
        },
      });
      if (!scoreOnSubject) {
        throw new NotFoundException('ScoreOnSubject not foud');
      }

      const subject = await this.prisma.subject.findUnique({
        where: {
          id: scoreOnSubject.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject is invaild');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: scoreOnSubject.subjectId,
        userId: user.id,
      });
      return await this.scoreOnSubjectRepository.delete({
        scoreOnSubjectId: scoreOnSubject.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
