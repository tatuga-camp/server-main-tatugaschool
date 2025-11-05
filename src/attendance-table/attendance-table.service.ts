import { AttendanceRepository } from './../attendance/attendance.repository';
import { StorageService } from '../storage/storage.service';
import { TeacherOnSubjectService } from './../teacher-on-subject/teacher-on-subject.service';
import { AttendanceTableRepository } from './attendance-table.repository';
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
import {
  Attendance,
  AttendanceRow,
  AttendanceStatusList,
  AttendanceTable,
  Student,
  User,
} from '@prisma/client';
import { ResponseGetAttendanceTableById } from './interfaces';
import { AttendanceStatusListSRepository } from '../attendance-status-list/attendance-status-list.repository';
import { StudentOnSubjectRepository } from '../student-on-subject/student-on-subject.repository';
import { AttendanceRowRepository } from '../attendance-row/attendance-row.repository';

@Injectable()
export class AttendanceTableService {
  private logger: Logger;
  attendanceTableRepository: AttendanceTableRepository;
  attendanceStatusListSRepository: AttendanceStatusListSRepository;
  studentOnSubjectRepository: StudentOnSubjectRepository;
  attendanceRowRepository: AttendanceRowRepository;
  attendanceRepository: AttendanceRepository;
  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private storageService: StorageService,
  ) {
    this.logger = new Logger(AttendanceTableService.name);
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      prisma,
      storageService,
    );
    this.attendanceRowRepository = new AttendanceRowRepository(prisma);
    this.attendanceTableRepository = new AttendanceTableRepository(prisma);
    this.attendanceRepository = new AttendanceRepository(prisma);
    this.attendanceStatusListSRepository = new AttendanceStatusListSRepository(
      prisma,
    );
  }

  async getBySubjectId(
    dto: GetAttendanceTablesDto,
    user: User,
  ): Promise<(AttendanceTable & { statusLists: AttendanceStatusList[] })[]> {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const tables = await this.attendanceTableRepository.getAttendanceTables({
        subjectId: dto.subjectId,
      });

      const statusLists = await this.attendanceStatusListSRepository.findMany({
        where: {
          attendanceTableId: {
            in: tables.map((table) => table.id),
          },
        },
      });
      return tables.map((table) => ({
        ...table,
        statusLists: statusLists.filter(
          (status) => status.attendanceTableId === table.id,
        ),
      }));
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getBySubjectIdOnStudentOnSubject(
    dto: { subjectId: string; studentId: string },
    student: Student,
  ): Promise<
    (AttendanceTable & {
      statusLists: AttendanceStatusList[];
      rows: AttendanceRow[];
      attendances: Attendance[];
    })[]
  > {
    try {
      if (student.id !== dto.studentId) {
        throw new ForbiddenException("You don't have access to this student");
      }
      const studentOnSubject = await this.studentOnSubjectRepository.findFirst({
        where: {
          subjectId: dto.subjectId,
          studentId: student.id,
        },
      });

      if (!studentOnSubject) {
        throw new ForbiddenException('Student not found');
      }

      const tables = await this.attendanceTableRepository.findMany({
        where: {
          subjectId: dto.subjectId,
        },
      });

      const [rows, attendances, statusLists] = await Promise.all([
        tables.length > 0
          ? this.attendanceRowRepository.findMany({
              where: {
                attendanceTableId: {
                  in: tables.map((table) => table.id),
                },
              },
            })
          : [],
        this.attendanceRepository.findMany({
          where: {
            attendanceTableId: {
              in: tables.map((table) => table.id),
            },
            studentOnSubjectId: studentOnSubject.id,
          },
        }),
        this.attendanceStatusListSRepository.findMany({
          where: {
            attendanceTableId: {
              in: tables.map((table) => table.id),
            },
          },
        }),
      ]);

      return tables.map((table) => ({
        ...table,
        rows: rows.filter((row) => row.attendanceTableId === table.id),
        attendances: attendances.filter(
          (attendance) => attendance.attendanceTableId === table.id,
        ),
        statusLists: statusLists.filter(
          (status) => status.attendanceTableId === table.id,
        ),
      }));
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

      await this.teacherOnSubjectService.ValidateAccess({
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
  ): Promise<AttendanceTable & { statusLists: AttendanceStatusList[] }> {
    try {
      const subject = await this.prisma.subject.findUnique({
        where: {
          id: dto.subjectId,
        },
      });

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      if (subject.isLocked === true) {
        throw new ForbiddenException(
          'Subject is locked. Cannot make any changes!',
        );
      }

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      const statusListsData = [
        {
          title: 'Present',
          value: 1,
          color: '#22c55e',
        },
        {
          title: 'Late',
          value: 1,
          color: '#eab308',
        },
        {
          title: 'Sick',
          value: 1,
          color: '#f97316',
        },
        {
          title: 'Absent',
          value: -1,
          color: '#ef4444',
        },
        {
          title: 'Holiday',
          value: 1,
          color: '#0ea5e9',
        },
      ];

      const create = await this.attendanceTableRepository.createAttendanceTable(
        {
          ...dto,
          schoolId: subject.schoolId,
        },
      );

      const statusLists = await Promise.all(
        statusListsData.map((status) =>
          this.attendanceStatusListSRepository.create({
            data: {
              schoolId: subject.schoolId,
              title: status.title,
              value: status.value,
              attendanceTableId: create.id,
              subjectId: dto.subjectId,
              color: status.color,
            },
          }),
        ),
      );

      return { ...create, statusLists: statusLists };
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
  ): Promise<AttendanceTable> {
    try {
      const table = await this.prisma.attendanceTable.findUnique({
        where: {
          id: dto.attendanceTableId,
        },
      });

      if (!table) {
        throw new NotFoundException('Attendance table not found');
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
