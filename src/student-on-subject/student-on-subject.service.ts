import { StudentAccessTokenStrategy } from './../auth/strategy/accessToken.strategy';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentOnSubject, User } from '@prisma/client';
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

@Injectable()
export class StudentOnSubjectService {
  logger: Logger = new Logger(StudentOnSubjectService.name);
  studentOnSubjectRepository: StudentOnSubjectRepositoryType;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
  ) {
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      prisma,
      googleStorageService,
    );
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

      return await this.studentOnSubjectRepository.getStudentOnSubjectsBySubjectId(
        {
          subjectId: dto.subjectId,
        },
      );
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
        picture: student.picture,
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
