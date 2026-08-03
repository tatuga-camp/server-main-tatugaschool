import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ReactionOnAnnouncement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UserRepository } from '../users/users.repository';
import { ToggleReactionDto } from './dto';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

export type ToggleReactionResult = {
  action: 'added' | 'removed' | 'switched';
  reaction: ReactionOnAnnouncement | null;
};

@Injectable()
export class ReactionOnAnnouncementService {
  private logger: Logger = new Logger(ReactionOnAnnouncementService.name);
  private userRepository: UserRepository;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
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

  private async toggle(input: {
    announcementId: string;
    subjectId: string;
    schoolId: string;
    emoji: string;
    studentId?: string;
    userId?: string;
    firstName: string;
    photo: string | null;
  }): Promise<ToggleReactionResult> {
    const existing = await this.prisma.reactionOnAnnouncement.findFirst({
      where: {
        announcementId: input.announcementId,
        ...(input.studentId
          ? { studentId: input.studentId }
          : { userId: input.userId }),
      },
    });

    if (existing && existing.emoji === input.emoji) {
      await this.prisma.reactionOnAnnouncement.delete({
        where: { id: existing.id },
      });
      return { action: 'removed', reaction: null };
    }

    if (existing) {
      const updated = await this.prisma.reactionOnAnnouncement.update({
        where: { id: existing.id },
        data: { emoji: input.emoji },
      });
      return { action: 'switched', reaction: updated };
    }

    const created = await this.prisma.reactionOnAnnouncement.create({
      data: {
        emoji: input.emoji,
        firstName: input.firstName,
        photo: input.photo,
        announcementId: input.announcementId,
        subjectId: input.subjectId,
        schoolId: input.schoolId,
        studentId: input.studentId,
        userId: input.userId,
      },
    });
    return { action: 'added', reaction: created };
  }

  async toggleFromStudent(
    dto: ToggleReactionDto,
    student: StudentJwtPayload,
  ): Promise<ToggleReactionResult> {
    try {
      const announcement = await this.getAnnouncementOrThrow(
        dto.announcementId,
      );

      const studentOnSubject = await this.prisma.studentOnSubject.findFirst({
        where: {
          subjectId: announcement.subjectId,
          studentId: student.id,
          isActive: true,
        },
      });

      if (!studentOnSubject) {
        throw new ForbiddenException("You don't have permission to access");
      }

      return await this.toggle({
        announcementId: announcement.id,
        subjectId: announcement.subjectId,
        schoolId: announcement.schoolId,
        emoji: dto.emoji,
        studentId: student.id,
        firstName: studentOnSubject.firstName,
        photo: studentOnSubject.photo,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async toggleFromTeacher(
    dto: ToggleReactionDto,
    user: UserJwtPayload,
  ): Promise<ToggleReactionResult> {
    try {
      const announcement = await this.getAnnouncementOrThrow(
        dto.announcementId,
      );

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: announcement.subjectId,
      });

      const userInfo = await this.userRepository.findById({ id: user.id });

      if (!userInfo) {
        throw new NotFoundException('User not found');
      }

      return await this.toggle({
        announcementId: announcement.id,
        subjectId: announcement.subjectId,
        schoolId: announcement.schoolId,
        emoji: dto.emoji,
        userId: user.id,
        firstName: userInfo.firstName,
        photo: userInfo.photo,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
