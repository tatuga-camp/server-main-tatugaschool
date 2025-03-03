import { StudentOnSubjectService } from './../student-on-subject/student-on-subject.service';
import { AttendanceRepository } from './../attendance/attendance.repository';
import { AttendanceTableRepository } from './../attendance-table/attendance-table.repository';
import { AttendanceRowRepository } from './attendance-row.repository';
import {
  Injectable,
  Logger,
  Get,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Attendance,
  AttendanceRow,
  StudentOnSubject,
  User,
} from '@prisma/client';
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
  attendanceRowRepository: AttendanceRowRepository;
  private attendanceTableRepository: AttendanceTableRepository;
  private attendanceRepository: AttendanceRepository;

  constructor(
    private prisma: PrismaService,
    private studentOnSubjectService: StudentOnSubjectService,
  ) {
    this.logger = new Logger(AttendanceRowService.name);
    this.attendanceRowRepository = new AttendanceRowRepository(prisma);
    this.attendanceRepository = new AttendanceRepository(this.prisma);
    this.attendanceTableRepository = new AttendanceTableRepository(this.prisma);
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
  ): Promise<(AttendanceRow & { attendances: Attendance[] })[]> {
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

      const attendances = await this.attendanceRepository.findMany({
        where: {
          attendanceRowId: {
            in: rows.map((row) => row.id),
          },
        },
      });

      return rows.map((row) => {
        return {
          ...row,
          attendances: attendances.filter(
            (attendance) => attendance.attendanceRowId === row.id,
          ),
        };
      });
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

  async GetAttendanceQrCode(dto: { attendanceRowId: string }): Promise<{
    students: (StudentOnSubject & { attendance: Attendance })[];
    attendanceRow: AttendanceRow;
  }> {
    try {
      const attendanceRow =
        await this.attendanceRowRepository.getAttendanceRowById({
          attendanceRowId: dto.attendanceRowId,
        });

      if (!attendanceRow) {
        throw new NotFoundException('Attendance row not found');
      }

      const attendances = await this.attendanceRepository.findMany({
        where: {
          attendanceRowId: attendanceRow.id,
        },
      });

      const studentOnSubjects =
        await this.studentOnSubjectService.studentOnSubjectRepository.findMany({
          where: {
            subjectId: attendanceRow.subjectId,
          },
        });

      return {
        attendanceRow,
        students: studentOnSubjects.map((studentOnSubject) => {
          const attendance = attendances.find(
            (attendance) => attendance.studentId === studentOnSubject.studentId,
          );

          return {
            ...studentOnSubject,
            attendance,
          };
        }),
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async CreateAttendanceRow(
    dto: CreateAttendanceRowDto,
    user: User,
  ): Promise<AttendanceRow & { attendances: Attendance[] }> {
    try {
      const table = await this.attendanceTableRepository.getAttendanceTableById(
        {
          attendanceTableId: dto.attendanceTableId,
        },
      );

      if (!table) throw new NotFoundException('Attendance table not found');

      await this.validateAccess({
        userId: user.id,
        schoolId: table.schoolId,
        subjectId: table.subjectId,
      });

      if (
        dto.type === 'SCAN' &&
        (!dto.allowScanAt || !dto.expireAt || !dto.isAllowScanManyTime)
      ) {
        throw new BadRequestException(
          'Attendance Type Scan require allowScanAt, expireAt, isAllowScanManyTime',
        );
      }

      const row = await this.attendanceRowRepository.createAttendanceRow({
        data: { ...dto, schoolId: table.schoolId, subjectId: table.subjectId },
      });

      const attendances = await this.attendanceRepository.findMany({
        where: {
          attendanceRowId: row.id,
        },
      });

      return { ...row, attendances };
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

  async DeleteAttendanceRow(
    dto: DeleteAttendanceRowDto,
    user: User,
  ): Promise<AttendanceRow> {
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

      const remove = await this.attendanceRowRepository.deleteAttendanceRow({
        attendanceRowId: dto.attendanceRowId,
      });

      return remove;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
