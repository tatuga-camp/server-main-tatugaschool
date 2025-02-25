import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { StudentRepository } from './../student/student.repository';
import { ScoreOnStudentRepository } from './score-on-student.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateScoreOnStudentDto,
  DeleteScoreOnStudentDto,
  GetAllScoreOnStudentByStudentIdDto,
  GetAllScoreOnStudentBySubjectIdDto,
} from './dto';
import { ScoreOnStudent, User } from '@prisma/client';
import { GoogleStorageService } from '../google-storage/google-storage.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';

@Injectable()
export class ScoreOnStudentService {
  logger: Logger = new Logger(ScoreOnStudentService.name);
  scoreOnStudentRepository: ScoreOnStudentRepository;
  studentOnSubjectRepository: StudentOnSubjectRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
    this.scoreOnStudentRepository = new ScoreOnStudentRepository(this.prisma);
  }

  async getAllScoreOnStudentBySubjectId(
    dto: GetAllScoreOnStudentBySubjectIdDto,
    user: User,
  ): Promise<ScoreOnStudent[]> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.scoreOnStudentRepository.findMany({
        where: {
          subjectId: dto.subjectId,
          ...(dto.filter?.startDate &&
            dto.filter?.endDate && {
              createAt: {
                gte: dto.filter.startDate,
                lte: dto.filter.endDate,
              },
            }),
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAllScoreOnStudentByStudentId(
    dto: GetAllScoreOnStudentByStudentIdDto,
    user: User,
  ): Promise<ScoreOnStudent[]> {
    try {
      const student = await this.prisma.studentOnSubject.findUnique({
        where: {
          id: dto.studentOnSubjectId,
        },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: student.subjectId,
      });

      return await this.scoreOnStudentRepository.getAllScoreOnStudentByStudentId(
        {
          studentOnSubjectId: dto.studentOnSubjectId,
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createScoreOnStudent(
    dto: CreateScoreOnStudentDto,
    user: User,
  ): Promise<ScoreOnStudent> {
    try {
      const [studentOnSubject, scoreOnSubject] = await Promise.all([
        this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        }),
        this.prisma.scoreOnSubject.findUnique({
          where: {
            id: dto.scoreOnSubjectId,
          },
        }),
      ]);

      if (!studentOnSubject) {
        throw new NotFoundException('Student not found');
      }

      if (!scoreOnSubject) {
        throw new NotFoundException('Score on subject not found');
      }

      if (!studentOnSubject.isActive) {
        throw new ForbiddenException('Student is disabled');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      const create = this.scoreOnStudentRepository.createSocreOnStudent({
        ...dto,
        title: scoreOnSubject.title,
        blurHash: scoreOnSubject.blurHash,
        icon: scoreOnSubject.icon,
        subjectId: studentOnSubject.subjectId,
        schoolId: studentOnSubject.schoolId,
        studentId: studentOnSubject.studentId,
      });

      await this.studentOnSubjectRepository.updateStudentOnSubject({
        query: {
          studentOnSubjectId: dto.studentOnSubjectId,
        },
        data: {
          totalSpeicalScore: studentOnSubject.totalSpeicalScore + dto.score,
        },
      });
      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteScoreOnStudent(
    dto: DeleteScoreOnStudentDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const scoreOnStudent = await this.prisma.scoreOnStudent.findUnique({
        where: {
          id: dto.scoreOnStudentId,
        },
      });

      if (!scoreOnStudent) {
        throw new NotFoundException('Score on student not found');
      }

      const studentOnSubject = await this.prisma.studentOnSubject.findUnique({
        where: {
          id: scoreOnStudent.studentOnSubjectId,
        },
      });

      if (!studentOnSubject) {
        throw new NotFoundException('Student not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      const deleteScore =
        await this.scoreOnStudentRepository.deleteScoreOnStudent({
          scoreOnStudentId: dto.scoreOnStudentId,
        });

      await this.studentOnSubjectRepository.updateStudentOnSubject({
        query: {
          studentOnSubjectId: studentOnSubject.id,
        },
        data: {
          totalSpeicalScore:
            studentOnSubject.totalSpeicalScore - scoreOnStudent.score,
        },
      });

      return deleteScore;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
