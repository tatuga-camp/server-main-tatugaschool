import { ScoreOnStudentRepository } from './../score-on-student/score-on-student.repository';
import { StudentAccessTokenStrategy } from './../auth/strategy/accessToken.strategy';
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
import { SortDto } from './dto/patch-student-on-subject.dto';

@Injectable()
export class StudentOnSubjectService {
  private logger: Logger = new Logger(StudentOnSubjectService.name);
  studentOnSubjectRepository: StudentOnSubjectRepositoryType;
  private scoreOnStudentRepository: ScoreOnStudentRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
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
      const member = await this.prisma.teacherOnSubject.findFirst({
        where: {
          subjectId: dto.subjectId,
          userId: user.id,
        },
      });

      const schoolMember = await this.prisma.memberOnSchool.findFirst({
        where: {
          schoolId: member.schoolId,
          userId: user.id,
        },
      });

      if (!member || !schoolMember) {
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

      const schoolMember = await this.prisma.memberOnSchool.findFirst({
        where: {
          schoolId: studentOnSubject[0].schoolId,
          userId: user.id,
        },
      });

      if (!schoolMember) {
        throw new ForbiddenException('You are not a member of this subject');
      }

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
      const member = await this.prisma.teacherOnSubject.findFirst({
        where: {
          subjectId: studentOnSubject.subjectId,
          userId: user.id,
        },
      });

      const schoolMember = await this.prisma.memberOnSchool.findFirst({
        where: {
          schoolId: member.schoolId,
          userId: user.id,
        },
      });

      if (!member || !schoolMember) {
        throw new ForbiddenException('You are not a member of this subject');
      }
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
      const member = await this.prisma.teacherOnSubject.findFirst({
        where: {
          subjectId: dto.subjectId,
          userId: user.id,
        },
      });

      const schoolMember = await this.prisma.memberOnSchool.findFirst({
        where: {
          schoolId: member.schoolId,
          userId: user.id,
        },
      });

      if (!member && user.role !== 'ADMIN' && schoolMember.role !== 'ADMIN') {
        throw new ForbiddenException('You are not a member of this subject');
      }

      const student = await this.prisma.student.findUnique({
        where: {
          id: dto.studentId,
        },
      });

      if (!student) {
        throw new NotFoundException('Student does not exist');
      }

      const studentData = {
        title: student.title,
        firstName: student.firstName,
        lastName: student.lastName,
        photo: student.photo,
        number: student.number,
        studentId: student.id,
        classId: student.classId,
        subjectId: dto.subjectId,
        schoolId: student.schoolId,
      };

      return await this.studentOnSubjectRepository.createStudentOnSubject(
        studentData,
      );
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

      const member = await this.prisma.teacherOnSubject.findFirst({
        where: {
          subjectId: studentOnSubjects[0].subjectId,
          userId: user.id,
        },
      });

      if (!member) {
        throw new ForbiddenException('You are not a member of this subject');
      }

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
      const member = await this.prisma.teacherOnSubject.findFirst({
        where: {
          subjectId: studentOnSubject.subjectId,
          userId: user.id,
        },
      });

      const schoolMember = await this.prisma.memberOnSchool.findFirst({
        where: {
          schoolId: member.schoolId,
          userId: user.id,
        },
      });

      if (!member && user.role !== 'ADMIN' && schoolMember.role !== 'ADMIN') {
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
