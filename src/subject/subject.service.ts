import { TeacherOnSubjectRepository } from './../teacher-on-subject/teacher-on-subject.repository';
import { ScoreOnSubjectRepository } from './../score-on-subject/score-on-subject.repository';
import { AttendanceTableRepository } from './../attendance-table/attendance-table.repository';
import { SubjectRepository, SubjectRepositoryType } from './subject.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Subject, User } from '@prisma/client';
import { NotFoundError } from 'rxjs';
import { Pagination } from '../interfaces';
import {
  CreateSubjectDto,
  DeleteSubjectDto,
  GetSubjectByIdDto,
  GetSubjectByPageDto,
  ReorderSubjectsDto,
  UpdateSubjectDto,
  getAllSubjectsByTeamIdParam,
  getAllSubjectsByTeamIdQuery,
} from './dto';

@Injectable()
export class SubjectService {
  logger: Logger = new Logger(SubjectService.name);
  subjectRepository: SubjectRepositoryType = new SubjectRepository(
    this.prisma,
    this.googleStorageService,
  );
  attendanceTableRepository: AttendanceTableRepository;
  scoreOnSubjectRepository: ScoreOnSubjectRepository;
  teacherOnSubjectRepository: TeacherOnSubjectRepository =
    new TeacherOnSubjectRepository(this.prisma);
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.attendanceTableRepository = new AttendanceTableRepository(prisma);
    this.scoreOnSubjectRepository = new ScoreOnSubjectRepository(prisma);
  }

  async validateAccessOnSubject({
    userId,
    subjectId,
  }: {
    userId: string;
    subjectId: string;
  }): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      const member = await this.prisma.teacherOnSubject.findFirst({
        where: {
          userId: userId,
          subjectId: subjectId,
        },
      });

      if (!member && user.role !== 'ADMIN') {
        throw new ForbiddenException('You do not have access to this subject');
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectById(dto: GetSubjectByIdDto, user: User): Promise<Subject> {
    try {
      await this.validateAccessOnSubject({
        userId: user.id,
        subjectId: dto.subjectId,
      });
      return await this.subjectRepository.getSubjectById({
        subjectId: dto.subjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getSubjectByPage(
    dto: GetSubjectByPageDto,
    user: User,
  ): Promise<Pagination<Subject>> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: dto.schoolId,
        },
      });

      if (!memberOnSchool) {
        throw new ForbiddenException('Access denied');
      }

      const teacherOnSubjects = await this.prisma.teacherOnSubject.findMany({
        where: {
          userId: user.id,
          status: 'ACCEPT',
        },
      });

      const queryTitles = teacherOnSubjects.map((teacherOnSubject) => {
        return {
          id: teacherOnSubject.subjectId,
          title: {
            contains: dto.search,
          },
        };
      });

      const queryDescriptions = teacherOnSubjects.map((teacherOnSubject) => {
        return {
          id: teacherOnSubject.subjectId,
          title: {
            contains: dto.search,
          },
        };
      });

      const counts = await this.prisma.subject.count({
        where: {
          schoolId: dto.schoolId,
          educationYear: dto.educationYear,
          OR: [...queryTitles, ...queryDescriptions],
        },
      });

      const totalPages = Math.ceil(counts / dto.limit);
      if (dto.page > totalPages) {
        return {
          data: [],
          meta: {
            total: 1,
            lastPage: 1,
            currentPage: 1,
            prev: 1,
            next: 1,
          },
        };
      }

      const skip = (dto.page - 1) * dto.limit;

      const subjects = await this.prisma.subject.findMany({
        where: {
          schoolId: dto.schoolId,
          educationYear: dto.educationYear,
          OR: [...queryTitles, ...queryDescriptions],
        },
        skip,
        take: dto.limit,
      });

      return {
        data: subjects,
        meta: {
          total: totalPages,
          lastPage: totalPages,
          currentPage: dto.page,
          prev: dto.page - 1 < 0 ? dto.page : dto.page - 1,
          next: dto.page + 1 > totalPages ? dto.page : dto.page + 1,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createSubject(dto: CreateSubjectDto, user: User): Promise<Subject> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: dto.schoolId,
        },
      });

      if (!memberOnSchool && user.role !== 'ADMIN') {
        throw new ForbiddenException('Access denied');
      }

      const totalSubject = await this.prisma.subject.count({
        where: {
          userId: user.id,
          educationYear: dto.educationYear,
        },
      });

      const subject = await this.subjectRepository.createSubject({
        ...dto,
        userId: user.id,
        order: totalSubject + 1,
      });
      const scoreOnSubjectTitlesDefault = [
        {
          title: 'Good Job',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Good-job.svg',
          blurHash: 'UEO{GV?D05-m~9WDIqah0NWV08M~X_ows.ov',
        },
        {
          title: 'Well Done',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Well-Done.svg',
          blurHash: 'UlMi|;xpE4n+IrWDs.bFIqahE5bY~QovIrjI',
        },
        {
          title: 'Keep It Up',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Keep-It-Up.svg',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
        },
        {
          title: 'Excellent',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Excellent.svg',
          blurHash: 'UAP63q^z06?C^}WCM~a#05WC07Ir~jt5E4oe',
        },
        {
          title: 'Needs Improvement',
          icon: 'https://storage.googleapis.com/development-tatuga-school/public/Needs-Improvement.svg',
          blurHash: 'UAPPF5^z05?W~RRlNIoe05WC07IY~QxrD-WD',
        },
      ];
      await Promise.all([
        this.prisma.teacherOnSubject.create({
          data: {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            role: 'ADMIN',
            status: 'ACCEPT',
            photo: user.photo,
            subjectId: subject.id,
            schoolId: dto.schoolId,
          },
        }),
        this.attendanceTableRepository.createAttendanceTable({
          title: 'Default',
          description: 'Attendance table for ' + subject.title,
          subjectId: subject.id,
          schoolId: dto.schoolId,
        }),
        ...scoreOnSubjectTitlesDefault.map((score) =>
          this.scoreOnSubjectRepository.createSocreOnSubject({
            title: score.title,
            icon: score.icon,
            subjectId: subject.id,
            score: 1,
            schoolId: dto.schoolId,
            blurHash: score.blurHash,
          }),
        ),
      ]);

      return subject;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateSubject(dto: UpdateSubjectDto, user: User): Promise<Subject> {
    try {
      await this.validateAccessOnSubject({
        userId: user.id,
        subjectId: dto.query.subjectId,
      });

      return await this.subjectRepository.updateSubject({
        query: {
          subjectId: dto.query.subjectId,
        },
        body: dto.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async reorderSubjects(
    dto: ReorderSubjectsDto,
    user: User,
  ): Promise<Subject[]> {
    try {
      const memberOnSchool = await this.prisma.memberOnSchool.findFirst({
        where: {
          userId: user.id,
          schoolId: dto.schoolId,
        },
      });

      if (!memberOnSchool && user.role !== 'ADMIN') {
        throw new ForbiddenException('Access denied');
      }
      const subjects = await this.prisma.subject.findMany({
        where: {
          id: {
            in: dto.subjectIds,
          },
          educationYear: dto.educationYear,
        },
      });

      if (subjects.length !== dto.subjectIds.length) {
        throw new NotFoundException('Subject not found');
      }

      subjects.forEach((subject) => {
        if (!subject.id) {
          throw new NotFoundException("Subject doesn't have id");
        }
        if (subject.userId !== user.id) {
          throw new ForbiddenException(
            'You do not have access to this subject',
          );
        }
      });

      return await this.subjectRepository.reorderSubjects({
        subjectIds: dto.subjectIds,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteSubject(
    dto: DeleteSubjectDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      await this.validateAccessOnSubject({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.subjectRepository.deleteSubject({
        subjectId: dto.subjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
