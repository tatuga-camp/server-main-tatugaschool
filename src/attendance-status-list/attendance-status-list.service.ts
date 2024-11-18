import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { AttendanceTableRepository } from './../attendance-table/attendance-table.repository';
import { AttendanceStatusListSRepository } from './attendance-status-list.repository';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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

      await this.teacherOnSubjectService.ValidateAccess({
        subjectId: table.subjectId,
        userId: user.id,
      });

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
