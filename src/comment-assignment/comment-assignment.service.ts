import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { PrismaService } from '../prisma/prisma.service';
import { CommentAssignmentRepository } from './comment-assignment.repository';
import {
  Injectable,
  Logger,
  Get,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateCommentOnAssignmentDto,
  DeleteCommentAssignmentDto,
  GetCommentAssignmentByStudentOnAssignmentIdDto,
  UpdateCommentOnAssignmentDto,
} from './dto';
import { Student, User } from '@prisma/client';
import { TeacherOnSubjectRepository } from '../teacher-on-subject/teacher-on-subject.repository';

@Injectable()
export class CommentAssignmentService {
  logger: Logger = new Logger(CommentAssignmentService.name);
  studentOnAssignmentRepository: StudentOnAssignmentRepository =
    new StudentOnAssignmentRepository(this.prisma);
  commentAssignmentRepository: CommentAssignmentRepository =
    new CommentAssignmentRepository(this.prisma);
  teacherOnSubjectRepository: TeacherOnSubjectRepository =
    new TeacherOnSubjectRepository(this.prisma);
  constructor(private prisma: PrismaService) {}

  async getByStudentOnAssignmentIdFromStudent(
    dto: GetCommentAssignmentByStudentOnAssignmentIdDto,
    student: Student,
  ) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (studentOnAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.commentAssignmentRepository.getByStudentOnAssignmentId(
        dto,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getByStudentOnAssignmentIdFromTeacher(
    dto: GetCommentAssignmentByStudentOnAssignmentIdDto,
    user: User,
  ) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: studentOnAssignment.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.commentAssignmentRepository.getByStudentOnAssignmentId(
        dto,
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFromStudent(dto: CreateCommentOnAssignmentDto, student: Student) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('studentOnAssignment is not found');
      }

      return await this.commentAssignmentRepository.create({
        ...dto,
        studentOnAssignmentId: studentOnAssignment.id,
        studentId: student.id,
        title: student.title,
        firstName: student.firstName,
        lastName: student.lastName,
        picture: student.picture,
        subjectId: studentOnAssignment.subjectId,
        schoolId: student.schoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFromTeacher(dto: CreateCommentOnAssignmentDto, user: User) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('studentOnAssignment is not found');
      }
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: studentOnAssignment.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }

      return await this.commentAssignmentRepository.create({
        ...dto,
        studentOnAssignmentId: studentOnAssignment.id,
        title: 'Teacher',
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.photo,
        userId: user.id,
        teacherOnSubjectId: teacherOnSubject.id,
        role: teacherOnSubject.role,
        email: user.email,
        subjectId: studentOnAssignment.subjectId,
        schoolId: teacherOnSubject.schoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateFromStudent(dto: UpdateCommentOnAssignmentDto, student: Student) {
    try {
      const commentAssignment = await this.commentAssignmentRepository.getById({
        commentOnAssignmentId: dto.query.commentOnAssignmentId,
      });
      if (commentAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.commentAssignmentRepository.update(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateFromTeacher(dto: UpdateCommentOnAssignmentDto, user: User) {
    try {
      const commentAssignment = await this.commentAssignmentRepository.getById({
        commentOnAssignmentId: dto.query.commentOnAssignmentId,
      });
      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: commentAssignment.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.commentAssignmentRepository.update(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFromStudent(dto: DeleteCommentAssignmentDto, student: Student) {
    try {
      const commentAssignment = await this.commentAssignmentRepository.getById({
        commentOnAssignmentId: dto.commentOnAssignmentId,
      });

      if (commentAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.commentAssignmentRepository.delete(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFromTeacher(dto: DeleteCommentAssignmentDto, user: User) {
    try {
      const commentAssignment = await this.commentAssignmentRepository.getById({
        commentOnAssignmentId: dto.commentOnAssignmentId,
      });

      const teacherOnSubject =
        await this.teacherOnSubjectRepository.getByTeacherIdAndSubjectId({
          teacherId: user.id,
          subjectId: commentAssignment.subjectId,
        });

      if (!teacherOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }
      return await this.commentAssignmentRepository.delete(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
