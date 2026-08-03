import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FileOnAnnouncement } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StorageService } from '../storage/storage.service';
import {
  CreateFileOnAnnouncementDto,
  DeleteFileOnAnnouncementDto,
  GetFileOnAnnouncementByAnnouncementIdDto,
  UpdateFileOnAnnouncementDto,
} from './dto';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Injectable()
export class FileOnAnnouncementService {
  private logger: Logger = new Logger(FileOnAnnouncementService.name);

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private storageService: StorageService,
  ) {}

  async getByAnnouncementId(
    dto: GetFileOnAnnouncementByAnnouncementIdDto,
    user: UserJwtPayload,
  ): Promise<FileOnAnnouncement[]> {
    try {
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: dto.announcementId },
      });

      if (!announcement) {
        throw new NotFoundException('Announcement not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: announcement.subjectId,
      });

      return await this.prisma.fileOnAnnouncement.findMany({
        where: { announcementId: dto.announcementId },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateFileOnAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<FileOnAnnouncement> {
    try {
      const file = await this.prisma.fileOnAnnouncement.findUnique({
        where: { id: dto.query.fileOnAnnouncementId },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: file.subjectId,
      });

      return await this.prisma.fileOnAnnouncement.update({
        where: { id: file.id },
        data: { ...dto.body },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    dto: CreateFileOnAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<FileOnAnnouncement> {
    try {
      const announcement = await this.prisma.announcement.findUnique({
        where: { id: dto.announcementId },
      });

      if (!announcement) {
        throw new NotFoundException('Announcement not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: announcement.subjectId,
      });

      const create = await this.prisma.fileOnAnnouncement.create({
        data: {
          type: dto.type,
          url: dto.url,
          name: dto.name,
          size: dto.size,
          blurHash: dto.blurHash,
          announcementId: announcement.id,
          subjectId: announcement.subjectId,
          schoolId: announcement.schoolId,
        },
      });

      await this.prisma.school.update({
        where: { id: announcement.schoolId },
        data: { totalStorage: { increment: create.size } },
      });

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteFileOnAnnouncementDto,
    user: UserJwtPayload,
  ): Promise<FileOnAnnouncement> {
    try {
      const file = await this.prisma.fileOnAnnouncement.findUnique({
        where: { id: dto.fileOnAnnouncementId },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: file.subjectId,
      });

      await this.prisma.fileOnAnnouncement.delete({
        where: { id: file.id },
      });

      if (file.type !== 'LINK') {
        const remaining = await this.prisma.fileOnAnnouncement.findMany({
          where: { url: file.url },
        });
        if (remaining.length === 0) {
          await this.storageService
            .DeleteFileOnStorage({ fileName: file.url })
            .catch((error) =>
              this.logger.error('Failed to delete file from storage', error),
            );
        }
      }

      await this.prisma.school.update({
        where: { id: file.schoolId },
        data: { totalStorage: { decrement: file.size } },
      });

      return file;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
