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

// studentId/userId are optional fields, so a Prisma findFirst on them compiles
// to a `$expr`/`$ne: [field, "$$REMOVE"]` pipeline MongoDB cannot serve from
// the announcementId index. The existing-reaction lookup uses findRaw instead.

type RawObjectId = { $oid: string };
type RawDate = { $date: string | { $numberLong: string } };

type RawReactionOnAnnouncement = {
  _id: RawObjectId;
  createAt: RawDate;
  updateAt: RawDate;
  emoji: string;
  firstName: string;
  photo?: string | null;
  announcementId: RawObjectId;
  subjectId: RawObjectId;
  schoolId: RawObjectId;
  studentId?: RawObjectId | null;
  userId?: RawObjectId | null;
};

function fromRawDate(raw: RawDate): Date {
  return typeof raw.$date === 'string'
    ? new Date(raw.$date)
    : new Date(Number(raw.$date.$numberLong));
}

function fromRawReaction(
  doc: RawReactionOnAnnouncement,
): ReactionOnAnnouncement {
  return {
    id: doc._id.$oid,
    createAt: fromRawDate(doc.createAt),
    updateAt: fromRawDate(doc.updateAt),
    emoji: doc.emoji,
    firstName: doc.firstName,
    photo: doc.photo ?? null,
    announcementId: doc.announcementId.$oid,
    subjectId: doc.subjectId.$oid,
    schoolId: doc.schoolId.$oid,
    studentId: doc.studentId?.$oid ?? null,
    userId: doc.userId?.$oid ?? null,
  };
}

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
    const docs = (await this.prisma.reactionOnAnnouncement.findRaw({
      filter: {
        announcementId: { $oid: input.announcementId },
        ...(input.studentId
          ? { studentId: { $oid: input.studentId } }
          : { userId: { $oid: input.userId } }),
      },
      options: { limit: 1 },
    })) as unknown as RawReactionOnAnnouncement[];
    const existing = docs.length > 0 ? fromRawReaction(docs[0]) : null;

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
