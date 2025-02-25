import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
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
  studentOnAssignmentRepository: StudentOnAssignmentRepository;
  commentAssignmentRepository: CommentAssignmentRepository;
  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.commentAssignmentRepository = new CommentAssignmentRepository(
      this.prisma,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
  }

  async getByStudentOnAssignment(
    dto: GetCommentAssignmentByStudentOnAssignmentIdDto,
    user: User | null,
    student: Student | null,
  ) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          subjectId: studentOnAssignment.subjectId,
          userId: user.id,
        });
      }

      if (student && studentOnAssignment.studentId !== student.id) {
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
        photo: student.photo,
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

      const teacher = await this.teacherOnSubjectService.ValidateAccess({
        subjectId: studentOnAssignment.subjectId,
        userId: user.id,
      });

      if (!teacher) {
        throw new ForbiddenException("You don't have permission to access");
      }

      return await this.commentAssignmentRepository.create({
        ...dto,
        studentOnAssignmentId: studentOnAssignment.id,
        title: 'Teacher',
        firstName: user.firstName,
        lastName: user.lastName,
        photo: user.photo,
        userId: user.id,
        teacherOnSubjectId: teacher.id,
        role: teacher.role,
        email: user.email,
        subjectId: studentOnAssignment.subjectId,
        schoolId: teacher.schoolId,
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
        await this.teacherOnSubjectService.ValidateAccess({
          subjectId: commentAssignment.subjectId,
          userId: user.id,
        });
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

      if (!commentAssignment) {
        throw new NotFoundException('Comment assignment is not found');
      }

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

      if (!commentAssignment) {
        throw new NotFoundException('Comment assignment is not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: commentAssignment.subjectId,
        userId: user.id,
      });

      return await this.commentAssignmentRepository.delete(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
