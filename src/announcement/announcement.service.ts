import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Announcement, Subject } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotificationService } from '../notification/notification.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { StorageService } from '../storage/storage.service';
import { AnnouncementRepository } from './announcement.repository';
import { UserRepository } from '../users/users.repository';
import {
  CreateAnnouncementDto,
  DeleteAnnouncementDto,
  GetAnnouncementBySubjectIdDto,
  UpdateAnnouncementDto,
} from './dto';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

const STUDENT_CLIENT_URL = 'https://student.tatugaschool.com';

@Injectable()
export class AnnouncementService {
  private logger: Logger = new Logger(AnnouncementService.name);
  announcementRepository: AnnouncementRepository;
  private userRepository: UserRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private notificationService: NotificationService,
    private lineBotService: LineBotService,
    private storageService: StorageService,
  ) {
    this.announcementRepository = new AnnouncementRepository(this.prisma);
    this.userRepository = new UserRepository(this.prisma);
  }

  private feedInclude = {
    files: true,
    reactions: true,
    _count: { select: { comments: true } },
  } as const;

  async create(
    dto: CreateAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<Announcement> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const subject = await this.prisma.subject.findUnique({
        where: { id: dto.subjectId },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }

      const userInfo = await this.userRepository.findById({ id: user.id });

      if (!userInfo) {
        throw new NotFoundException('User not found');
      }

      const announcement = await this.announcementRepository.create({
        data: {
          title: dto.title,
          content: dto.content,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          photo: userInfo.photo,
          blurHash: userInfo.blurHash,
          userId: userInfo.id,
          subjectId: subject.id,
          schoolId: subject.schoolId,
        },
      });

      this.sendAnnouncementNotifications(announcement, subject, userInfo).catch(
        (error) =>
          this.logger.error('Announcement fan-out failed', error?.stack ?? error),
      );

      return announcement;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async sendAnnouncementNotifications(
    announcement: Announcement,
    subject: Subject,
    userInfo: { firstName: string; lastName: string; photo: string },
  ): Promise<void> {
    const link = new URL(
      `${STUDENT_CLIENT_URL}?subject_code=${subject.code}&announcement_id=${announcement.id}`,
    );

    // Bell/push channel: isolated in its own try/catch so a failure here
    // (including the recipient-list fetch) can never block the LINE channel below.
    try {
      const studentOnSubjects = await this.prisma.studentOnSubject.findMany({
        where: { subjectId: subject.id, isActive: true },
      });

      await this.notificationService.createStudentNotifications({
        studentIds: studentOnSubjects.map((s) => s.studentId),
        actorName: `${userInfo.firstName} ${userInfo.lastName}`,
        actorId: announcement.userId,
        actorImage: userInfo.photo,
        type: 'NEW_ANNOUNCEMENT',
        message: announcement.title,
        link,
        schoolId: announcement.schoolId,
        subjectId: announcement.subjectId,
      });
    } catch (error) {
      this.logger.error('Failed to create student notifications', error);
    }

    if (
      subject.isVerifyLine === true &&
      subject.lineGroupId &&
      subject.allowSendNotificationOnAnnouncementToLine === true
    ) {
      try {
        const school = await this.prisma.school.findUnique({
          where: { id: announcement.schoolId },
        });

        if (
          school &&
          (school.plan === 'PREMIUM' || school.plan === 'ENTERPRISE')
        ) {
          const plainContent = announcement.content
            .replace(/<[^>]*>/g, '')
            .slice(0, 200);
          await this.lineBotService.sendMessage({
            groupId: subject.lineGroupId,
            message: `📢 ประกาศใหม่จากคุณครู 📣\nวิชา: ${subject.title}\nเรื่อง: ${announcement.title}\n\n${plainContent}\n\nอ่านเพิ่มเติม: ${link.toString()}`,
          });
        }
      } catch (error) {
        this.logger.error('Failed to send line notification', error);
      }
    }
  }

  async getBySubjectFromTeacher(
    dto: GetAnnouncementBySubjectIdDto,
    user: UserJwtPayload,
  ): Promise<Announcement[]> {
    try {
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.announcementRepository.findMany({
        where: { subjectId: dto.subjectId },
        orderBy: { createAt: 'desc' },
        include: this.feedInclude,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getBySubjectFromStudent(
    dto: GetAnnouncementBySubjectIdDto,
    student: StudentJwtPayload,
  ): Promise<Announcement[]> {
    try {
      const studentOnSubject = await this.prisma.studentOnSubject.findFirst({
        where: {
          subjectId: dto.subjectId,
          studentId: student.id,
          isActive: true,
        },
      });

      if (!studentOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }

      return await this.announcementRepository.findMany({
        where: { subjectId: dto.subjectId },
        orderBy: { createAt: 'desc' },
        include: this.feedInclude,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<Announcement> {
    try {
      const announcement = await this.announcementRepository.findById({
        announcementId: dto.query.announcementId,
      });

      if (!announcement) {
        throw new NotFoundException('Announcement not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: announcement.subjectId,
      });

      const subject = await this.prisma.subject.findUnique({
        where: { id: announcement.subjectId },
      });

      if (subject?.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }

      return await this.announcementRepository.update({
        where: { id: announcement.id },
        data: { ...dto.body },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<Announcement> {
    try {
      const announcement = await this.announcementRepository.findById({
        announcementId: dto.announcementId,
      });

      if (!announcement) {
        throw new NotFoundException('Announcement not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: announcement.subjectId,
      });

      await this.prisma.commentOnAnnouncement.deleteMany({
        where: { announcementId: announcement.id },
      });
      await this.prisma.reactionOnAnnouncement.deleteMany({
        where: { announcementId: announcement.id },
      });

      const files = await this.prisma.fileOnAnnouncement.findMany({
        where: { announcementId: announcement.id },
      });

      let totalSize = 0;
      for (const file of files.filter((f) => f.type !== 'LINK')) {
        totalSize += file.size;
        await this.storageService
          .DeleteFileOnStorage({ fileName: file.url })
          .catch((error) =>
            this.logger.error('Failed to delete file from storage', error),
          );
      }

      await this.prisma.fileOnAnnouncement.deleteMany({
        where: { announcementId: announcement.id },
      });

      if (totalSize > 0) {
        await this.prisma.school.update({
          where: { id: announcement.schoolId },
          data: { totalStorage: { decrement: totalSize } },
        });
      }

      return await this.announcementRepository.delete({
        announcementId: announcement.id,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
