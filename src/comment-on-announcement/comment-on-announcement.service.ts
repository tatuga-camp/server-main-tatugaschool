import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CommentOnAnnouncement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UserRepository } from '../users/users.repository';
import { CommentOnAnnouncementRepository } from './comment-on-announcement.repository';
import {
  CreateCommentOnAnnouncementDto,
  DeleteCommentOnAnnouncementDto,
  GetCommentOnAnnouncementByAnnouncementIdDto,
  UpdateCommentOnAnnouncementDto,
} from './dto';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Injectable()
export class CommentOnAnnouncementService {
  private logger: Logger = new Logger(CommentOnAnnouncementService.name);
  commentOnAnnouncementRepository: CommentOnAnnouncementRepository;
  private userRepository: UserRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.commentOnAnnouncementRepository = new CommentOnAnnouncementRepository(
      this.prisma,
    );
    this.userRepository = new UserRepository(this.prisma);
  }

  private async getAnnouncementOrThrow(announcementId: string) {
    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  private async validateStudentEnrollment(
    subjectId: string,
    studentId: string,
  ) {
    const studentOnSubject = await this.prisma.studentOnSubject.findFirst({
      where: { subjectId, studentId, isActive: true },
    });
    if (!studentOnSubject) {
      throw new ForbiddenException("You don't have permission to access");
    }
    return studentOnSubject;
  }

  async getByAnnouncement(
    dto: GetCommentOnAnnouncementByAnnouncementIdDto,
    user: UserJwtPayload | null,
    student: StudentJwtPayload | null,
  ): Promise<CommentOnAnnouncement[]> {
    try {
      const announcement = await this.getAnnouncementOrThrow(
        dto.announcementId,
      );

      if (user) {
        await this.teacherOnSubjectService.ValidateAccess({
          userId: user.id,
          subjectId: announcement.subjectId,
        });
      }

      if (student) {
        await this.validateStudentEnrollment(
          announcement.subjectId,
          student.id,
        );
      }

      return await this.commentOnAnnouncementRepository.findMany({
        where: { announcementId: dto.announcementId },
        orderBy: { createAt: 'asc' },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFromStudent(
    dto: CreateCommentOnAnnouncementDto,
    student: StudentJwtPayload,
  ): Promise<CommentOnAnnouncement> {
    try {
      const announcement = await this.getAnnouncementOrThrow(
        dto.announcementId,
      );

      const studentOnSubject = await this.validateStudentEnrollment(
        announcement.subjectId,
        student.id,
      );

      return await this.commentOnAnnouncementRepository.create({
        data: {
          content: dto.content,
          announcementId: announcement.id,
          studentId: student.id,
          title: studentOnSubject.title,
          firstName: studentOnSubject.firstName,
          lastName: studentOnSubject.lastName,
          photo: studentOnSubject.photo,
          blurHash: studentOnSubject.blurHash,
          number: studentOnSubject.number,
          subjectId: announcement.subjectId,
          schoolId: announcement.schoolId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createFromTeacher(
    dto: CreateCommentOnAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<CommentOnAnnouncement> {
    try {
      const announcement = await this.getAnnouncementOrThrow(
        dto.announcementId,
      );

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: announcement.subjectId,
      });

      const teacherOnSubject =
        await this.teacherOnSubjectService.teacherOnSubjectRepository.getByTeacherIdAndSubjectId(
          {
            teacherId: user.id,
            subjectId: announcement.subjectId,
          },
        );

      const userInfo = await this.userRepository.findById({ id: user.id });

      if (!userInfo) {
        throw new NotFoundException('User not found');
      }

      return await this.commentOnAnnouncementRepository.create({
        data: {
          content: dto.content,
          announcementId: announcement.id,
          userId: userInfo.id,
          title: 'Teacher',
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          photo: userInfo.photo,
          blurHash: userInfo.blurHash,
          role: teacherOnSubject?.role,
          email: userInfo.email,
          subjectId: announcement.subjectId,
          schoolId: announcement.schoolId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateFromStudent(
    dto: UpdateCommentOnAnnouncementDto,
    student: StudentJwtPayload,
  ): Promise<CommentOnAnnouncement> {
    try {
      const comment = await this.commentOnAnnouncementRepository.findById({
        commentOnAnnouncementId: dto.query.commentOnAnnouncementId,
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }

      return await this.commentOnAnnouncementRepository.update({
        where: { id: comment.id },
        data: { ...dto.body },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateFromTeacher(
    dto: UpdateCommentOnAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<CommentOnAnnouncement> {
    try {
      const comment = await this.commentOnAnnouncementRepository.findById({
        commentOnAnnouncementId: dto.query.commentOnAnnouncementId,
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.userId !== user.id) {
        throw new ForbiddenException('You can only edit your own comment');
      }

      return await this.commentOnAnnouncementRepository.update({
        where: { id: comment.id },
        data: { ...dto.body },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFromStudent(
    dto: DeleteCommentOnAnnouncementDto,
    student: StudentJwtPayload,
  ): Promise<CommentOnAnnouncement> {
    try {
      const comment = await this.commentOnAnnouncementRepository.findById({
        commentOnAnnouncementId: dto.commentOnAnnouncementId,
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      if (comment.studentId !== student.id) {
        throw new ForbiddenException("You don't have permission to access");
      }

      return await this.commentOnAnnouncementRepository.delete({
        commentOnAnnouncementId: comment.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteFromTeacher(
    dto: DeleteCommentOnAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<CommentOnAnnouncement> {
    try {
      const comment = await this.commentOnAnnouncementRepository.findById({
        commentOnAnnouncementId: dto.commentOnAnnouncementId,
      });

      if (!comment) {
        throw new NotFoundException('Comment not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: comment.subjectId,
      });

      return await this.commentOnAnnouncementRepository.delete({
        commentOnAnnouncementId: comment.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
