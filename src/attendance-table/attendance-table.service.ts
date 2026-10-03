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
import { PrismaReadService } from '../prisma/prisma-read.service';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';
import { CacheService } from '../cache/cache.service';
import { CacheRefs } from '../cache/cache-refs';
import { AssignmentReads } from '../assignment/assignment.reads';
import { AttendanceReads } from './attendance.reads';

@Injectable()
export class AttendanceTableService {
  private logger: Logger;
  attendanceTableRepository: AttendanceTableRepository;
  attendanceStatusListSRepository: AttendanceStatusListSRepository;
  studentOnSubjectRepository: StudentOnSubjectRepository;
  attendanceRowRepository: AttendanceRowRepository;
  attendanceRepository: AttendanceRepository;
  refs: CacheRefs;
  reads: AssignmentReads;
  attendanceReads: AttendanceReads;
  constructor(
    private prisma: PrismaService,
    private teacherOnSubjectService: TeacherOnSubjectService,
    private storageService: StorageService,
    private prismaReadService: PrismaReadService,
    private cache: CacheService,
  ) {
    this.logger = new Logger(AttendanceTableService.name);
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      this.prisma,
      this.storageService,
      this.cache,
      this.prismaReadService,
    );
    this.attendanceRowRepository = new AttendanceRowRepository(
      this.prisma,
      this.cache,
    );
    this.attendanceTableRepository = new AttendanceTableRepository(
      this.prisma,
      this.prismaReadService,
      this.cache,
    );
    this.attendanceRepository = new AttendanceRepository(
      this.prisma,
      this.prismaReadService,
      this.cache,
    );
    this.attendanceStatusListSRepository = new AttendanceStatusListSRepository(
      this.prisma,
      this.cache,
    );
    this.refs = new CacheRefs(this.prisma, this.cache);
    this.reads = new AssignmentReads(this.prisma, this.cache);
    this.attendanceReads = new AttendanceReads(this.prisma, this.cache);
  }

  async getBySubjectId(
    dto: GetAttendanceTablesDto,
    user: UserJwtPayload,
  ): Promise<(AttendanceTable & { statusLists: AttendanceStatusList[] })[]> {
    try {
      const subject = await this.refs.subject(dto.subjectId);

      if (!subject) {
        throw new NotFoundException('Subject not found');
      }

      // Authorize on every request, before reading any cached subject data.
      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: dto.subjectId,
      });

      return await this.attendanceReads.tables(dto.subjectId);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getBySubjectIdOnStudentOnSubject(
    dto: { subjectId: string; studentId: string },
    student: StudentJwtPayload,
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
      // The enrolment is cached (null too) but checked on every request,
      // before reading any cached attendance.
      const studentOnSubject = await this.reads.enrollment(
        dto.subjectId,
        student.id,
      );

      if (!studentOnSubject) {
        throw new ForbiddenException('Student not found');
      }

      const [tables, { rows, attendances }] = await Promise.all([
        this.attendanceReads.tables(dto.subjectId),
        this.attendanceReads.studentAttendance(
          dto.subjectId,
          studentOnSubject.id,
        ),
      ]);

      // statusLists moves back to the end, keeping the response's key order.
      return tables.map(({ statusLists, ...table }) => ({
        ...table,
        rows: rows.filter((row) => row.attendanceTableId === table.id),
        attendances: attendances.filter(
          (attendance) => attendance.attendanceTableId === table.id,
        ),
        statusLists,
      }));
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async getAttendanceTableById(
    dto: GetAttendanceTableById,
    user: UserJwtPayload,
  ): Promise<ResponseGetAttendanceTableById> {
    try {
      const table = await this.attendanceTableRepository.findUnique({
        where: {
          id: dto.attendanceTableId,
        },
      });

      if (!table) {
        throw new NotFoundException('attendanceTableId not found');
      }

      const [studentOnSubjects, rows] = await Promise.all([
        this.studentOnSubjectRepository.findMany({
          where: {
            subjectId: table.subjectId,
          },
        }),
        this.attendanceRowRepository.findMany({
          where: {
            attendanceTableId: table.id,
          },
        }),
      ]);

      const attendances =
        rows.length > 0
          ? await this.attendanceRepository.findMany({
              where: {
                attendanceRowId: {
                  in: rows.map((row) => row.id),
                },
              },
            })
          : [];

      await this.teacherOnSubjectService.ValidateAccess({
        userId: user.id,
        subjectId: table.subjectId,
      });

      return {
        ...table,
        rows: rows.map((row) => ({
          ...row,
          attendances: attendances.filter(
            (attendance) => attendance.attendanceRowId === row.id,
          ),
        })),
        students: studentOnSubjects,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async createAttendanceTable(
    dto: CreateAttendanceTableDto,
    user: UserJwtPayload,
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
    user: UserJwtPayload,
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
    user: UserJwtPayload,
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
