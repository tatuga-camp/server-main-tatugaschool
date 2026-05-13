import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Student, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './../notification/notification.service';
import { StudentOnAssignmentRepository } from './../student-on-assignment/student-on-assignment.repository';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { CommentAssignmentRepository } from './comment-assignment.repository';
import {
  CreateCommentOnAssignmentDto,
  DeleteCommentAssignmentDto,
  GetCommentAssignmentByStudentOnAssignmentIdDto,
  UpdateCommentOnAssignmentDto,
} from './dto';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';
import { UserRepository } from '../users/users.repository';

@Injectable()
export class CommentAssignmentService {
  logger: Logger = new Logger(CommentAssignmentService.name);
  private studentOnAssignmentRepository: StudentOnAssignmentRepository;
  public commentAssignmentRepository: CommentAssignmentRepository;
  private userRepository: UserRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private notificationService: NotificationService,
  ) {
    this.commentAssignmentRepository = new CommentAssignmentRepository(
      this.prisma,
    );
    this.studentOnAssignmentRepository = new StudentOnAssignmentRepository(
      this.prisma,
    );
    this.userRepository = new UserRepository(this.prisma);
  }

  async getByStudentOnAssignment(
    dto: GetCommentAssignmentByStudentOnAssignmentIdDto,
    user: UserJwtPayload | null,
    student: StudentJwtPayload | null,
  ) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('studentOnAssignment is not found');
      }

      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          subjectId: studentOnAssignment.subjectId,
          userId: user.id,
        });
      }

      if (student && studentOnAssignment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }

      return await this.commentAssignmentRepository.findMany({
        where: {
          studentOnAssignmentId: dto.studentOnAssignmentId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFromStudent(
    dto: CreateCommentOnAssignmentDto,
    student: StudentJwtPayload,
  ) {
    try {
      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      if (!studentOnAssignment) {
        throw new NotFoundException('studentOnAssignment is not found');
      }
      const params = {
        studentOnAssignmentId: studentOnAssignment.id,
        menu: 'studentwork',
      };
      const urlParams = new URLSearchParams();
      for (const key in params) {
        urlParams.append(key, params[key]);
      }

      const create = await this.commentAssignmentRepository.create({
        ...dto,
        studentOnAssignmentId: studentOnAssignment.id,
        studentId: studentOnAssignment.id,
        title: studentOnAssignment.title,
        firstName: studentOnAssignment.firstName,
        lastName: studentOnAssignment.lastName,
        photo: studentOnAssignment.photo,
        subjectId: studentOnAssignment.subjectId,
        schoolId: studentOnAssignment.schoolId,
      });

      const teachers =
        await this.teacherOnSubjectService.teacherOnSubjectRepository.getManyBySubjectId(
          {
            subjectId: studentOnAssignment.subjectId,
          },
        );

      const newUrl = `${process.env.CLIENT_URL}/subject/${studentOnAssignment.subjectId}/assignment/${studentOnAssignment.assignmentId}?${urlParams.toString()}`;
      const url = new URL(newUrl);
      await this.notificationService.createNotifications({
        type: 'STUDENT_COMMENT',
        userIds: teachers.map((t) => t.userId),
        actorId: studentOnAssignment.id,
        actorName: `${studentOnAssignment.firstName} ${studentOnAssignment.lastName}`,
        actorImage: studentOnAssignment.photo,
        message: `New comment on assignment from ${studentOnAssignment.firstName} ${studentOnAssignment.lastName}`,
        link: url,
        schoolId: student.schoolId,
        subjectId: studentOnAssignment.subjectId,
      });
      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFromTeacher(
    dto: CreateCommentOnAssignmentDto,
    user: UserJwtPayload,
  ) {
    try {
      const userInfo = await this.userRepository.findById({
        id: user.id,
      });

      if (!userInfo) {
        throw new NotFoundException('User not found');
      }

      const studentOnAssignment =
        await this.studentOnAssignmentRepository.getById({
          studentOnAssignmentId: dto.studentOnAssignmentId,
        });

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: studentOnAssignment.subjectId,
        userId: user.id,
      });

      const teacherOnSubject =
        await this.teacherOnSubjectService.teacherOnSubjectRepository.getByTeacherIdAndSubjectId(
          {
            teacherId: user.id,
            subjectId: studentOnAssignment.subjectId,
          },
        );
      if (!teacherOnSubject) {
        throw new ForbiddenException(
          'Only teacher in this subject can leave the comment',
        );
      }

      const subject = await this.prisma.subject.findUnique({
        where: {
          id: teacherOnSubject.subjectId,
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

      return await this.commentAssignmentRepository.create({
        ...dto,
        studentOnAssignmentId: studentOnAssignment.id,
        title: 'Teacher',
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        photo: userInfo.photo,
        userId: userInfo.id,
        teacherOnSubjectId: teacherOnSubject.id,
        role: teacherOnSubject.role,
        email: userInfo.email,
        subjectId: studentOnAssignment.subjectId,
        schoolId: teacherOnSubject.schoolId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateFromStudent(
    dto: UpdateCommentOnAssignmentDto,
    student: StudentJwtPayload,
  ) {
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

  async updateFromTeacher(
    dto: UpdateCommentOnAssignmentDto,
    user: UserJwtPayload,
  ) {
    try {
      const commentAssignment = await this.commentAssignmentRepository.getById({
        commentOnAssignmentId: dto.query.commentOnAssignmentId,
      });

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

  async deleteFromStudent(
    dto: DeleteCommentAssignmentDto,
    student: StudentJwtPayload,
  ) {
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

  async deleteFromTeacher(
    dto: DeleteCommentAssignmentDto,
    user: UserJwtPayload,
  ) {
    try {
      const commentAssignment = await this.commentAssignmentRepository.getById({
        commentOnAssignmentId: dto.commentOnAssignmentId,
      });

      if (!commentAssignment) {
        throw new NotFoundException('Comment assignment is not found');
      }

      const subject = await this.prisma.subject.findUnique({
        where: {
          id: commentAssignment.subjectId,
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
