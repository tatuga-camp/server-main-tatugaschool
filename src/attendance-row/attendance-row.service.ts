import {
  AttendanceRowRepository,
  AttendanceRowRepositoryType,
} from './attendance-row.repository';
import {
  Injectable,
  Logger,
  Get,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceRow, User } from '@prisma/client';
import {
  CreateAttendanceRowDto,
  DeleteAttendanceRowDto,
  GetAttendanceRowByIdDto,
  GetAttendanceRowsDto,
  UpdateAttendanceRowDto,
} from './dto';
import {
  RequestGetAttendanceRows,
  ResponseGetAttendanceRowById,
} from './interfaces';

@Injectable()
export class AttendanceRowService {
  logger: Logger;
  attendanceRowRepository: AttendanceRowRepositoryType;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(AttendanceRowService.name);
    this.attendanceRowRepository = new AttendanceRowRepository(prisma);
  }

  async validateAccess({
    userId,
    schoolId,
    subjectId,
  }: {
    userId: string;
    schoolId: string;
    subjectId: string;
  }) {
    const [memberOnSchool, teacherOnSubject] = await Promise.all([
      this.prisma.memberOnSchool.findFirst({
        where: {
          userId: userId,
          schoolId: schoolId,
        },
      }),

      this.prisma.teacherOnSubject.findFirst({
        where: {
          subjectId: subjectId,
          userId: userId,
        },
      }),
    ]);

    if (!memberOnSchool) {
      throw new ForbiddenException('Access denied');
    }

    if (!teacherOnSubject && memberOnSchool.role !== 'ADMIN') {
      throw new ForbiddenException('Access denied');
    }
  }

  async GetAttendanceRows(
    dto: GetAttendanceRowsDto,
    user: User,
  ): Promise<AttendanceRow[]> {
    try {
      const table = await this.prisma.attendanceTable.findUnique({
        where: {
          id: dto.attendanceTableId,
        },
      });

      if (!table) throw new NotFoundException('Attendance table not found');

      await this.validateAccess({
        userId: user.id,
        schoolId: table.schoolId,
        subjectId: table.subjectId,
      });

      const rows = await this.attendanceRowRepository.getAttendanceRows({
        attendanceTableId: dto.attendanceTableId,
      });

      return rows;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async GetAttendanceRowById(
    dto: GetAttendanceRowByIdDto,
    user: User,
  ): Promise<ResponseGetAttendanceRowById> {
    try {
      const row = await this.attendanceRowRepository.getAttendanceRowById({
        attendanceRowId: dto.attendanceRowId,
      });

      await this.validateAccess({
        userId: user.id,
        schoolId: row.schoolId,
        subjectId: row.subjectId,
      });

      return row;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async CreateAttendanceRow(
    dto: CreateAttendanceRowDto,
    user: User,
  ): Promise<AttendanceRow> {
    try {
      const table = await this.prisma.attendanceTable.findUnique({
        where: {
          id: dto.attendanceTableId,
        },
      });

      if (!table) throw new NotFoundException('Attendance table not found');

      await this.validateAccess({
        userId: user.id,
        schoolId: table.schoolId,
        subjectId: table.subjectId,
      });

      const row = await this.attendanceRowRepository.createAttendanceRow(dto);

      return row;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async UpdateAttendanceRow(
    dto: UpdateAttendanceRowDto,
    user: User,
  ): Promise<AttendanceRow> {
    try {
      const row = await this.prisma.attendanceRow.findUnique({
        where: {
          id: dto.query.attendanceRowId,
        },
      });

      if (!row) {
        throw new NotFoundException('Attendance row not found');
      }

      await this.validateAccess({
        userId: user.id,
        schoolId: row.schoolId,
        subjectId: row.subjectId,
      });

      return await this.attendanceRowRepository.updateAttendanceRow(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async DeleteAttendanceRow(dto: DeleteAttendanceRowDto, user: User) {
    try {
      const row = await this.prisma.attendanceRow.findUnique({
        where: {
          id: dto.attendanceRowId,
        },
      });

      if (!row) {
        throw new NotFoundException('Attendance row not found');
      }

      await this.validateAccess({
        userId: user.id,
        schoolId: row.schoolId,
        subjectId: row.subjectId,
      });

      await this.attendanceRowRepository.deleteAttendanceRow({
        attendanceRowId: dto.attendanceRowId,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
