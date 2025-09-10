import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { SubjectService } from './../subject/subject.service';
import { GradeRepository } from './grade.repository';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GradeRange, User } from '@prisma/client';

export type GradeRule = {
  min: number;
  max: number;
  grade: string;
};
@Injectable()
export class GradeService {
  private logger: Logger;
  gradeRepository: GradeRepository;

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SubjectService))
    private subjectService: SubjectService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.logger = new Logger(GradeService.name);
    this.gradeRepository = new GradeRepository(this.prisma);
  }

  async assignGrade(
    totalScore: number,
    gradeRange?: GradeRange,
  ): Promise<{ grade: string }> {
    try {
      let gradingRules = [
        {
          min: 80,
          max: 100,
          grade: '4',
        },
        {
          min: 75,
          max: 79,
          grade: '3.5',
        },
        {
          min: 70,
          max: 74,
          grade: '3',
        },
        {
          min: 65,
          max: 69,
          grade: '2.5',
        },
        {
          min: 60,
          max: 64,
          grade: '2',
        },
        {
          min: 55,
          max: 59,
          grade: '1.5',
        },
        {
          min: 50,
          max: 54,
          grade: '1',
        },
        {
          min: 0,
          max: 49,
          grade: '0',
        },
      ];

      if (gradeRange) {
        gradingRules = JSON.parse(
          gradeRange.gradeRules as string,
        ) as GradeRule[];
      }
      const grade =
        gradingRules
          .sort((a, b) => b.min - a.min)
          .find((rule) => totalScore >= rule.min)?.grade || 'N/A'; // Default grade if not found

      return { grade: grade };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    dto: {
      subjectId: string;
      gradeRanges: GradeRule[];
    },
    user: User,
  ): Promise<GradeRange> {
    try {
      const subject = await this.subjectService.subjectRepository.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject Not Found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: subject.id,
      });

      this.validateGradeRanges(dto.gradeRanges);

      const grade = await this.gradeRepository.create({
        data: {
          schoolId: subject.schoolId,
          subjectId: subject.id,
          gradeRules: JSON.stringify(dto.gradeRanges),
        },
      });
      return {
        ...grade,
        gradeRules: JSON.parse(grade.gradeRules as string),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: {
      gradeRangeId: string;
      gradeRange: GradeRule[];
    },
    user: User,
  ): Promise<GradeRange> {
    try {
      const gradeRange = await this.gradeRepository.findUnique({
        where: {
          id: dto.gradeRangeId,
        },
      });

      if (!gradeRange) {
        throw new NotFoundException('GradeRangeId is invaild');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: gradeRange.subjectId,
        userId: user.id,
      });
      this.validateGradeRanges(dto.gradeRange);
      const grade = await this.gradeRepository.update({
        where: {
          id: dto.gradeRangeId,
        },
        data: {
          gradeRules: JSON.stringify(dto.gradeRange),
        },
      });
      return {
        ...grade,
        gradeRules: JSON.parse(grade.gradeRules as string),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  validateGradeRanges(gradeRanges: GradeRule[]) {
    if (!Array.isArray(gradeRanges) || gradeRanges.length === 0) {
      throw new BadRequestException('Grade ranges must be a non-empty array');
    }

    // Sort by min score to ensure order
    gradeRanges.sort((a, b) => a.min - b.min);

    for (let i = 0; i < gradeRanges.length; i++) {
      const range = gradeRanges[i];

      // Check min ≤ max
      if (range.min > range.max) {
        throw new BadRequestException(
          `Invalid range: min (${range.min}) cannot be greater than max (${range.max})`,
        );
      }

      // Ensure ranges don't overlap
      if (i > 0) {
        const prevRange = gradeRanges[i - 1];

        if (range.min <= prevRange.max) {
          throw new BadRequestException(
            `Overlapping ranges detected: ${prevRange.grade} (${prevRange.min}-${prevRange.max}) conflicts with ${range.grade} (${range.min}-${range.max})`,
          );
        }

        // Ensure no gaps
        if (range.min !== prevRange.max + 1) {
          throw new BadRequestException(
            `Gap detected between ${prevRange.grade} (${prevRange.min}-${prevRange.max}) and ${range.grade} (${range.min}-${range.max})`,
          );
        }
      }
    }

    // Ensure min starts at 0 and max ends at 100
    if (gradeRanges[0].min !== 0) {
      throw new BadRequestException('The first grade range must start at 0');
    }
    if (gradeRanges[gradeRanges.length - 1].max !== 100) {
      throw new BadRequestException('The last grade range must end at 100');
    }

    return true;
  }
}
