import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
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
import { TeacherOnSubjectRepository } from '../teacher-on-subject/teacher-on-subject.repository';

@Injectable()
export class AttendanceTableService {
  private logger: Logger;
  attendanceTableRepository: AttendanceTableRepositoryType;

  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
  ) {
    this.logger = new Logger(AttendanceTableService.name);
    this.attendanceTableRepository = new AttendanceTableRepository(prisma);
  }

  async getBySubjectId(
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

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
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

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
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

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.attendanceTableRepository.createAttendanceTable({
        ...dto,
        schoolId: subject.schoolId,
      });
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

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: table.subjectId,
      });

      return await this.attendanceTableRepository.updateAttendanceTable(dto);
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

      const member = await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: table.subjectId,
      });

      return await this.attendanceTableRepository.deleteAttendanceTable(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
