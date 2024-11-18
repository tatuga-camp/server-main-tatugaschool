import { StudentOnSubjectRepository } from './../student-on-subject/student-on-subject.repository';
import { AttendanceRowRepository } from './../attendance-row/attendance-row.repository';
import { GoogleStorageService } from './../google-storage/google-storage.service';
import { SubjectRepository } from './../subject/subject.repository';
import { AttendanceRepository } from './attendance.repository';
import {
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

@Injectable()
export class AttendanceService {
  private logger: Logger;
  private subjectRepository: SubjectRepository = new SubjectRepository(
    this.prisma,
    this.googleStorageService,
  );
  attendanceRepository: AttendanceRepository;
  private attendanceStatusListSRepository: AttendanceStatusListSRepository;
  private attendanceRowRepository: AttendanceRowRepository;
  private studentOnSubjectRepository: StudentOnSubjectRepository;
  constructor(
    private prisma: PrismaService,
    private googleStorageService: GoogleStorageService,
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

  async update(dto: UpdateAttendanceDto, user: User): Promise<Attendance> {
    try {
      const attendance = await this.attendanceRepository.getAttendanceById({
        attendanceId: dto.query.attendanceId,
      });
      if (!attendance) {
        throw new NotFoundException('Attendance not found');
      }
      const status = await this.attendanceStatusListSRepository.findMany({
        where: {
          attendanceTableId: attendance.attendanceTableId,
        },
      });

      if (!status.some((s) => s.title === dto.body.status)) {
        throw new ForbiddenException('Status not found');
      }

      await this.validateAccess({
        userId: user.id,
        subjectId: attendance.subjectId,
      });
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
}
