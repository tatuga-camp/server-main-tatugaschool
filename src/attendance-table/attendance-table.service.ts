import {
  AttendanceTableRepository,
  AttendanceTableRepositoryType,
} from './attendance-table.repository';
import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAttendanceTableDto,
  DeleteAttendanceTableDto,
  GetAttendanceTableById,
  GetAttendanceTablesDto,
  UpdateAttendanceTableDto,
} from './dto';
import { AttendanceTable, User } from '@prisma/client';
import { ResponseGetAttendanceTableById } from './interfaces';

@Injectable()
export class AttendanceTableService {
  logger: Logger;
  attendanceTableRepository: AttendanceTableRepositoryType;
  constructor(private prisma: PrismaService) {
    this.logger = new Logger(AttendanceTableService.name);
    this.attendanceTableRepository = new AttendanceTableRepository(prisma);
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

  async getAttendanceTables(
    dto: GetAttendanceTablesDto,
    user: User,
  ): Promise<AttendanceTable[]> {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      await this.validateAccess({
        userId: user.id,
        schoolId: subject.schoolId,
        subjectId: dto.subjectId,
      });

      const tables = this.attendanceTableRepository.getAttendanceTables({
        subjectId: dto.subjectId,
      });
      return tables;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAttendanceTableById(
    dto: GetAttendanceTableById,
    user: User,
  ): Promise<ResponseGetAttendanceTableById> {
    try {
      const table = await this.attendanceTableRepository.getAttendanceTableById(
        {
          attendanceTableId: dto.attendanceTableId,
        },
      );

      if (!table) {
        throw new NotFoundException('Attendance table not found');
      }

      await this.validateAccess({
        userId: user.id,
        schoolId: table.schoolId,
        subjectId: table.subjectId,
      });

      return table;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createAttendanceTable(
    dto: CreateAttendanceTableDto,
    user: User,
  ): Promise<AttendanceTable> {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      await this.validateAccess({
        userId: user.id,
        schoolId: subject.schoolId,
        subjectId: dto.subjectId,
      });

      return this.attendanceTableRepository.createAttendanceTable(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateAttendanceTable(
    dto: UpdateAttendanceTableDto,
    user: User,
  ): Promise<AttendanceTable> {
    try {
      const table = await this.prisma.attendanceTable.findUnique({
        where: {
          id: dto.query.attendanceTableId,
        },
      });

      if (!table) {
        throw new NotFoundException('Attendance table not found');
      }

      await this.validateAccess({
        userId: user.id,
        schoolId: table.schoolId,
        subjectId: table.subjectId,
      });

      return this.attendanceTableRepository.updateAttendanceTable(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async deleteAttendanceTable(
    dto: DeleteAttendanceTableDto,
    user: User,
  ): Promise<{ message: string }> {
    try {
      const table = await this.prisma.attendanceTable.findUnique({
        where: {
          id: dto.attendanceTableId,
        },
      });

      if (!table) {
        throw new NotFoundException('Attendance table not found');
      }

      await this.validateAccess({
        userId: user.id,
        schoolId: table.schoolId,
        subjectId: table.subjectId,
      });

      return this.attendanceTableRepository.deleteAttendanceTable(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
