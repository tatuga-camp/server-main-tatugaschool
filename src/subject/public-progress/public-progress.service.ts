import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PublicProgressLevel } from '@prisma/client';
import * as crypto from 'crypto';
import { UserJwtPayload } from '../../interfaces/jwt-payload';
import { PrismaService } from '../../prisma/prisma.service';
import { TeacherOnSubjectService } from '../../teacher-on-subject/teacher-on-subject.service';
import { buildPublicProgress, PublicProgress } from './public-progress.util';

type PublicProgressState = {
  token: string | null;
  level: PublicProgressLevel;
};

@Injectable()
export class PublicProgressService {
  private logger: Logger = new Logger(PublicProgressService.name);

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {}

  async share(
    dto: { subjectId: string; level: PublicProgressLevel },
    user: UserJwtPayload,
  ): Promise<PublicProgressState> {
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: dto.subjectId,
    });
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
      select: { publicProgressToken: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const updated = await this.prisma.subject.update({
      where: { id: dto.subjectId },
      data: {
        publicProgressToken:
          subject.publicProgressToken ?? crypto.randomBytes(16).toString('hex'),
        publicProgressLevel: dto.level,
      },
      select: { publicProgressToken: true, publicProgressLevel: true },
    });
    return {
      token: updated.publicProgressToken,
      level: updated.publicProgressLevel,
    };
  }

  async updateLevel(
    dto: { subjectId: string; level: PublicProgressLevel },
    user: UserJwtPayload,
  ): Promise<PublicProgressState> {
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: dto.subjectId,
    });
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
      select: { publicProgressToken: true },
    });
    if (!subject?.publicProgressToken) {
      throw new NotFoundException('Progress link is not shared');
    }
    const updated = await this.prisma.subject.update({
      where: { id: dto.subjectId },
      data: { publicProgressLevel: dto.level },
      select: { publicProgressToken: true, publicProgressLevel: true },
    });
    return {
      token: updated.publicProgressToken,
      level: updated.publicProgressLevel,
    };
  }

  async revoke(
    dto: { subjectId: string },
    user: UserJwtPayload,
  ): Promise<PublicProgressState> {
    await this.teacherOnSubjectService.ValidateAccess({
      userId: user.id,
      subjectId: dto.subjectId,
    });
    const updated = await this.prisma.subject.update({
      where: { id: dto.subjectId },
      data: { publicProgressToken: null },
      select: { publicProgressToken: true, publicProgressLevel: true },
    });
    return { token: null, level: updated.publicProgressLevel };
  }

  async getByToken(token: string): Promise<PublicProgress> {
    const subjectId = await this.findSubjectIdByToken(token);
    if (!subjectId) throw new NotFoundException('Progress link not found');

    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      include: { class: { select: { title: true } } },
    });
    // Re-check the token on the loaded row: it may have been revoked or
    // rotated between the raw lookup and this read.
    if (
      !subject ||
      subject.isDeleted ||
      subject.publicProgressToken !== token
    ) {
      throw new NotFoundException('Progress link not found');
    }

    const [
      assignments,
      studentOnAssignments,
      gradeRange,
      scoreOnSubjects,
      scoreOnStudents,
      studentOnSubjects,
    ] = await Promise.all([
      // Same filter as AssignmentService.getOverviewScoreOnAssignments so the
      // public columns match the teacher Grade table.
      this.prisma.assignment.findMany({
        where: {
          subjectId,
          status: 'Published',
          type: { in: ['Assignment', 'VideoQuiz'] },
        },
      }),
      this.prisma.studentOnAssignment.findMany({ where: { subjectId } }),
      this.prisma.gradeRange.findUnique({ where: { subjectId } }),
      this.prisma.scoreOnSubject.findMany({ where: { subjectId } }),
      this.prisma.scoreOnStudent.findMany({ where: { subjectId } }),
      this.prisma.studentOnSubject.findMany({ where: { subjectId } }),
    ]);

    return buildPublicProgress(
      {
        subject: {
          title: subject.title,
          educationYear: subject.educationYear,
          backgroundImage: subject.backgroundImage ?? null,
        },
        className: subject.class?.title ?? '',
        assignments,
        studentOnAssignments,
        scoreOnSubjects,
        scoreOnStudents,
        studentOnSubjects,
        gradeRules: gradeRange?.gradeRules ?? null,
        now: new Date(),
      },
      subject.publicProgressLevel,
    );
  }

  // publicProgressToken is optional, so a Prisma filter on it compiles to a
  // non-indexable $expr and collscans. findRaw with a plain equality filter
  // is served by the { publicProgressToken } index.
  private async findSubjectIdByToken(token: string): Promise<string | null> {
    // A raw {publicProgressToken: null/undefined} filter would match every
    // subject without a link — never let a falsy token through.
    if (!token) return null;
    const docs = (await this.prisma.subject.findRaw({
      filter: { publicProgressToken: token },
      options: { limit: 1, projection: { _id: 1 } },
    })) as unknown as { _id: { $oid: string } }[];
    return docs[0]?._id?.$oid ?? null;
  }
}
