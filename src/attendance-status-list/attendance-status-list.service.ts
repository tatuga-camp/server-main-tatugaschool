import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { AttendanceTableRepository } from './../attendance-table/attendance-table.repository';
import { AttendanceStatusListSRepository } from './attendance-status-list.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStatusAttendanceDto,
  DeleteStatusDto,
  UpdateStatusDto,
} from './dto';
import { AttendanceStatusList, User } from '@prisma/client';

@Injectable()
export class AttendanceStatusListService {
  private logger: Logger = new Logger(AttendanceStatusListService.name);
  attendanceStatusListSRepository: AttendanceStatusListSRepository;
  private attendanceTableRepository: AttendanceTableRepository;
  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.attendanceStatusListSRepository = new AttendanceStatusListSRepository(
      this.prisma,
    );

    this.attendanceTableRepository = new AttendanceTableRepository(this.prisma);
  }

  async create(
    dto: CreateStatusAttendanceDto,
    user: User,
  ): Promise<AttendanceStatusList> {
    try {
      const table = await this.attendanceTableRepository.getAttendanceTableById(
        {
          attendanceTableId: dto.attendanceTableId,
        },
      );

      if (!table) {
        throw new NotFoundException('Attendance Table not found');
      }

      const subject = await this.prisma.subject.findUnique({
        where: {
          id: table.subjectId,
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
        subjectId: table.subjectId,
        userId: user.id,
      });

      const statusList = await this.attendanceStatusListSRepository.findMany({
        where: {
          attendanceTableId: table.id,
        },
      });

      if (statusList.some((s) => s.title === dto.title)) {
        throw new BadRequestException('Duplicate title');
      }

      const create = await this.attendanceStatusListSRepository.create({
        data: {
          ...dto,
          schoolId: table.schoolId,
          subjectId: table.subjectId,
        },
      });

      return create;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateStatusDto,
    user: User,
  ): Promise<AttendanceStatusList> {
    try {
      const status = await this.attendanceStatusListSRepository.findUnique({
        where: {
          id: dto.query.id,
        },
      });

      if (!status) {
        throw new NotFoundException('Status not found');
      }

      const subject = await this.prisma.subject.findUnique({
        where: {
          id: status.subjectId,
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

      const statusList = await this.attendanceStatusListSRepository.findMany({
        where: {
          attendanceTableId: status.attendanceTableId,
        },
      });

      if (
        dto.body.title &&
        statusList
          .filter((s) => s.id !== status.id)
          .some((s) => s.title === dto.body.title)
      ) {
        throw new BadRequestException('Duplicate title');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: status.subjectId,
      });

      const update = await this.attendanceStatusListSRepository.update({
        where: {
          id: dto.query.id,
        },
        data: dto.body,
      });

      if (dto.body.title) {
        await this.prisma.attendance.updateMany({
          where: {
            attendanceTableId: status.attendanceTableId,
            status: status.title as string,
          },
          data: {
            status: update.title,
          },
        });
      }
      return update;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async delete(
    dto: DeleteStatusDto,
    user: User,
  ): Promise<AttendanceStatusList> {
    try {
      const status = await this.attendanceStatusListSRepository.findUnique({
        where: {
          id: dto.id,
        },
      });

      if (!status) {
        throw new NotFoundException('Status not found');
      }
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: status.subjectId,
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
        userId: user.id,
        subjectId: status.subjectId,
      });

      return await this.attendanceStatusListSRepository.delete({
        where: {
          id: dto.id,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
