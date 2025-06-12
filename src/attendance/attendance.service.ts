import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { AttendanceRowRepository } from './../attendance-row/attendance-row.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { SubjectRepository } from './../subject/subject.repository';
import { AttendanceRepository } from './attendance.repository';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Attendance, User } from '@prisma/client';
import {
  CreateAttendanceDto,
  GetAttendanceByIdDto,
  UpdateAttendanceDto,
  UpdateManyDto,
} from './dto';
import { AttendanceStatusListSRepository } from '../attendance-status-list/attendance-status-list.repository';
import { Workbook } from 'exceljs';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { AttendanceRowService } from '../attendance-row/attendance-row.service';
import { Request, Response } from 'express';
@Injectable()
export class AttendanceService {
  private logger: Logger;
  private subjectRepository: SubjectRepository;
  attendanceRepository: AttendanceRepository;
  private attendanceStatusListSRepository: AttendanceStatusListSRepository;
  private attendanceRowRepository: AttendanceRowRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
    private studentOnSubjectService: StudentOnSubjectService,
    private attendanceTableService: AttendanceTableService,
    private attendanceRowService: AttendanceRowService,
  ) {
    this.logger = new Logger(AttendanceService.name);
    this.attendanceRepository = new AttendanceRepository(prisma);
    this.attendanceStatusListSRepository = new AttendanceStatusListSRepository(
      prisma,
    );
    this.attendanceRowRepository = new AttendanceRowRepository(prisma);
    this.studentOnSubjectRepository = new StudentOnSubjectRepository(
      prisma,
      googleStorageService,
    );
    this.subjectRepository = new SubjectRepository(
      this.prisma,
      this.googleStorageService,
    );
  }

  async validateAccess({
    userId,
    subjectId,
  }: {
    userId: string;
    subjectId: string;
  }) {
    const subject = await this.subjectRepository.getSubjectById({
      subjectId: subjectId,
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const [memberOnSchool, teacherOnSubject] = await Promise.all([
      this.prisma.memberOnSchool.findFirst({
        where: {
          userId: userId,
          schoolId: subject.schoolId,
        },
      }),

      this.prisma.teacherOnSubject.findFirst({
        where: {
          subjectId: subjectId,
          userId: userId,
        },
      }),
    ]);

    if (!memberOnSchool || memberOnSchool.status !== 'ACCEPT') {
      throw new ForbiddenException('Access denied');
    }

    if (
      (!teacherOnSubject || teacherOnSubject.status !== 'ACCEPT') &&
      memberOnSchool.role !== 'ADMIN'
    ) {
      throw new ForbiddenException('Access denied');
    }
  }

  async getAttendanceById(
    dto: GetAttendanceByIdDto,
    user: User,
  ): Promise<Attendance> {
    try {
      const attendance = await this.attendanceRepository.getAttendanceById({
        attendanceId: dto.attendanceId,
      });

      if (!attendance) {
        throw new NotFoundException('Attendance not found');
      }

      await this.validateAccess({
        userId: user.id,
        subjectId: attendance.subjectId,
      });

      return attendance;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(dto: CreateAttendanceDto, user: User): Promise<Attendance> {
    try {
      const [attendanceRow, studentOnSubject] = await Promise.all([
        this.attendanceRowRepository.getAttendanceRowById({
          attendanceRowId: dto.attendanceRowId,
        }),
        this.studentOnSubjectRepository.getStudentOnSubjectById({
          studentOnSubjectId: dto.studentOnSubjectId,
        }),
      ]);

      if (!studentOnSubject) {
        throw new NotFoundException('Student not found');
      }

      if (!attendanceRow) {
        throw new NotFoundException('Attendance row not found');
      }

      await this.validateAccess({
        userId: user.id,
        subjectId: attendanceRow.subjectId,
      });

      const status = await this.attendanceStatusListSRepository.findMany({
        where: {
          attendanceTableId: attendanceRow.attendanceTableId,
        },
      });

      if (!status.some((s) => s.title === dto.status)) {
        throw new ForbiddenException('Status not found');
      }
      return await this.attendanceRepository.create({
        data: {
          ...dto,
          startDate: attendanceRow.startDate,
          endDate: attendanceRow.endDate,
          studentId: studentOnSubject.studentId,
          schoolId: studentOnSubject.schoolId,
          attendanceTableId: attendanceRow.attendanceTableId,
          subjectId: studentOnSubject.subjectId,
        },
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(
    dto: UpdateAttendanceDto,
    user?: User | undefined,
  ): Promise<Attendance> {
    try {
      const attendance = await this.attendanceRepository.getAttendanceById({
        attendanceId: dto.query.attendanceId,
      });
      if (!attendance) {
        throw new NotFoundException('Attendance not found');
      }

      if (user) {
        await this.validateAccess({
          userId: user.id,
          subjectId: attendance.subjectId,
        });
      }

      if (!user) {
        const attendanceRow =
          await this.attendanceRowRepository.getAttendanceRowById({
            attendanceRowId: attendance.attendanceRowId,
          });

        const currentDate = new Date().getTime();
        const expireAt = new Date(attendanceRow.expireAt).getTime();

        if (currentDate > expireAt) {
          throw new BadRequestException("Time's up! for update attendance");
        }
      }

      const status = await this.attendanceStatusListSRepository.findMany({
        where: {
          attendanceTableId: attendance.attendanceTableId,
        },
      });

      if (!status.some((s) => s.title === dto.body.status)) {
        throw new ForbiddenException('Status not found');
      }

      return await this.attendanceRepository.updateAttendanceById(dto);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async updateMany(dto: UpdateManyDto, user: User): Promise<Attendance[]> {
    try {
      const attendance = await this.attendanceRepository.getAttendanceById({
        attendanceId: dto.data[0].query.attendanceId,
      });

      if (!attendance) {
        throw new NotFoundException('Attendance not found');
      }
      const status = await this.attendanceStatusListSRepository.findMany({
        where: {
          attendanceTableId: attendance.attendanceTableId,
        },
      });

      const attendances = await Promise.allSettled(
        dto.data.map(async (data) => {
          const attendance = await this.attendanceRepository.getAttendanceById({
            attendanceId: data.query.attendanceId,
          });
          if (!attendance) {
            throw new NotFoundException('Attendance not found');
          }

          if (!status.some((s) => s.title === data.body.status)) {
            throw new ForbiddenException('Status not found');
          }

          await this.validateAccess({
            userId: user.id,
            subjectId: attendance.subjectId,
          });
          return await this.attendanceRepository.updateAttendanceById(data);
        }),
      );

      const success = attendances.filter(
        (result) => result.status === 'fulfilled',
      );
      return success.map((result) => result.value);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async exportExcel(subjectId: string, user: User, req: Request) {
    const userLang = req.headers['accept-language']?.split(',')[0] || 'en-US';

    const listStudentOnSubject =
      await this.studentOnSubjectService.getStudentOnSubjectsBySubjectId(
        { subjectId },
        user,
      );
    const listAttendanceTable =
      await this.attendanceTableService.getBySubjectId({ subjectId }, user);

    const data = await Promise.all(
      listAttendanceTable.map(async (row) => {
        const listAttendanceTableBySubjectId =
          await this.attendanceRowService.GetAttendanceRows(
            { attendanceTableId: row.id },
            user,
          );
        return {
          worksheetName: row.title,
          attendanceRows: [
            'Nunber',
            'Student Name',
            ...listAttendanceTableBySubjectId.map((row) => {
              return new Date(row.startDate)
                .toLocaleString(userLang, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                })
                .replace(',', '')
                .replace('at', '');
            }),
          ],
          attendanceValues: listStudentOnSubject
            .sort((a, b) => Number(a.number) - Number(b.number))
            .map((student) => {
              return [
                student.number,
                student.title + student.firstName + ' ' + student.lastName,
                ...listAttendanceTableBySubjectId.map((row) => {
                  return row.attendances.find(
                    (att) => att.studentId === student.studentId,
                  )?.status;
                }),
              ];
            }),
        };
      }),
    );

    const workbook = new Workbook();
    data.forEach(async (row) => {
      const sanitizedWorksheetName = row.worksheetName.replace(
        /[*?:\\/\[\]]/g,
        '',
      );
      const worksheet = workbook.addWorksheet(sanitizedWorksheetName);

      worksheet.addRow(row.attendanceRows);
      worksheet.addRows(row.attendanceValues);

      const firstRow = worksheet.getRow(1);
      const columA = worksheet.getColumn(1);
      const columB = worksheet.getColumn(2);
      columA.width = 10;
      columB.width = 40;
      // set bold font and center alignment
      firstRow.font = { bold: true, size: 10 };
      firstRow.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };

      for (let i = 3; i <= row.attendanceRows.length; i++) {
        const column = worksheet.getColumn(i);
        column.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true,
        };
        column.width = 20;
      }
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
  }
}
