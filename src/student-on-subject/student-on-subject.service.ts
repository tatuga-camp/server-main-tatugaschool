import { WheelOfNameService } from './../wheel-of-name/wheel-of-name.service';
import { SubjectRepository } from './../subject/subject.repository';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { ScoreOnStudentRepository } from './../score-on-student/score-on-student.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoreOnStudent, StudentOnSubject, User } from '@prisma/client';
import {
  CreateStudentOnSubjectDto,
  DeleteStudentOnSubjectDto,
  GetStudentOnSubjectByIdDto,
  GetStudentOnSubjectsByStudentIdDto,
  GetStudentOnSubjectsBySubjectIdDto,
} from './dto';
import {
  StudentOnSubjectRepository,
  StudentOnSubjectRepositoryType,
} from './student-on-subject.repository';
import {
  SortDto,
  UpdateStudentOnSubjectDto,
} from './dto/patch-student-on-subject.dto';

@Injectable()
export class StudentOnSubjectService {
  private logger: Logger = new Logger(StudentOnSubjectService.name);
  studentOnSubjectRepository: StudentOnSubjectRepositoryType;
  private scoreOnStudentRepository: ScoreOnStudentRepository;
  private subjectRepository: SubjectRepository = new SubjectRepository(
    this.prisma,
    this.googleStorageService,
  );
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private wheelOfNameService: WheelOfNameService,
  ) {
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      prisma,
      googleStorageService,
    );
    this.scoreOnStudentRepository = new ScoreOnStudentRepository(prisma);
  }

  async getStudentOnSubjectsBySubjectId(
    dto: GetStudentOnSubjectsBySubjectIdDto,
    user: User,
  ): Promise<StudentOnSubject[]> {
    try {
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });
      const schoolMember = await this.prisma.memberOnSchool.findFirst({
        where: {
          schoolId: member.schoolId,
          userId: user.id,
        },
      });

      if (!schoolMember) {
        throw new ForbiddenException('You are not a member of this subject');
      }

      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: {
          subjectId: dto.subjectId,
        },
        orderBy: {
          order: 'asc',
        },
      });

      return studentOnSubjects;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateStudentOnSubjectDto,
    user: User,
  ): Promise<StudentOnSubject> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.query.id,
        });
      const subject = await this.subjectRepository.getSubjectById({
        subjectId: studentOnSubject.subjectId,
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      if (!studentOnSubject) {
        throw new NotFoundException('Student on subject does not exist');
      }
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      const update =
        await this.studentOnSubjectRepository.updateStudentOnSubject({
          query: {
            studentOnSubjectId: dto.query.id,
          },
          data: dto.data,
        });

      if (subject.wheelOfNamePath) {
        const studentActives = await this.studentOnSubjectRepository.findMany({
          where: {
            subjectId: studentOnSubject.subjectId,
            isActive: true,
          },
        });
        const studentOnSubjectCreates = studentActives.map((student) => {
          return {
            title: student.title,
            firstName: student.firstName,
            lastName: student.lastName,
            photo: student.photo,
            blurHash: student.blurHash,
            number: student.number,
            studentId: student.id,
            classId: student.classId,
            subjectId: subject.id,
            schoolId: student.schoolId,
          };
        });
        this.wheelOfNameService
          .update({
            path: subject.wheelOfNamePath,
            texts: studentOnSubjectCreates.map((student) => {
              return {
                text: `${student.title} ${student.firstName} ${student.lastName}`,
              };
            }),
            title: subject.title,
            description: subject.description,
          })
          .catch((error) => {
            this.logger.error(error);
          });
      }

      return update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getStudentOnSubjectsByStudentId(
    dto: GetStudentOnSubjectsByStudentIdDto,
    user: User,
  ): Promise<StudentOnSubject[]> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectsByStudentId({
          studentId: dto.studentId,
        });

      if (studentOnSubject.length === 0) {
        return [];
      }
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject[0].subjectId,
      });

      return studentOnSubject;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getStudentOnSubjectById(
    dto: GetStudentOnSubjectByIdDto,
    user: User,
  ): Promise<StudentOnSubject> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        });

      if (!studentOnSubject) {
        throw new NotFoundException('StudentOnSubject not found');
      }
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      return studentOnSubject;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createStudentOnSubject(
    dto: CreateStudentOnSubjectDto,
    user: User,
  ): Promise<StudentOnSubject> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const student = await this.prisma.student.findUnique({
        where: {
          id: dto.studentId,
        },
      });

      if (!student) {
        throw new NotFoundException('Student does not exist');
      }

      return await this.studentOnSubjectRepository.createStudentOnSubject({
        title: student.title,
        firstName: student.firstName,
        lastName: student.lastName,
        photo: student.photo,
        number: student.number,
        studentId: student.id,
        classId: student.classId,
        subjectId: dto.subjectId,
        blurHash: student.blurHash,
        schoolId: student.schoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async sortStudentOnSubjects(dto: SortDto, user: User) {
    try {
      const studentOnSubjects = await this.studentOnSubjectRepository.findMany({
        where: {
          id: {
            in: dto.studentOnSubjectIds,
          },
        },
      });
      studentOnSubjects.forEach((studentOnSubject) => {
        if (!studentOnSubject) {
          throw new NotFoundException('Student on subject does not exist');
        }
      });

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubjects[0].subjectId,
      });

      const updates = await Promise.allSettled(
        dto.studentOnSubjectIds.map((id, index) => {
          return this.prisma.studentOnSubject.update({
            where: {
              id,
            },
            data: {
              order: index,
            },
          });
        }),
      );
      const filterSuccess = updates.filter(
        (update) => update.status === 'fulfilled',
      );
      return filterSuccess;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteStudentOnSubject(
    dto: DeleteStudentOnSubjectDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const studentOnSubject =
        await this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        });

      if (!studentOnSubject) {
        throw new NotFoundException('Student on subject does not exist');
      }
      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: studentOnSubject.subjectId,
      });

      if (!member) {
        throw new ForbiddenException('You are not a member of this subject');
      }

      return await this.studentOnSubjectRepository.deleteStudentOnSubject({
        studentOnSubjectId: dto.studentOnSubjectId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
