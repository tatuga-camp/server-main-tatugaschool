import { Test } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { AppModule } from '../app.module';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { GetAttendanceByIdDto, UpdateAttendanceDto } from './dto';

describe('AttendanceService', () => {
  let attendanceService: AttendanceService;
  const userId = '66d5edd6ab46227db7d5e2db';
  const anotherOutsideSchoolUserId = '66ace7578c5561b748d8b3b3';
  const anotherOutsideSubjectUserId = '66cca07986f8be03df898fb6';
  const pendingOnSchoolMemberUserId = '66cca2fe86f8be03df898fb7';
  const subjectId = '66d5f00eab46227db7d5e2df';
  const attendanceId = '66ec4ab87e1d88db2d7fd9ce';
  const notFoundAttendanceId = '66ec4ab87e1d88db2d7fd9ca';

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [AttendanceService],
      imports: [AppModule],
    }).compile();

    attendanceService = module.get<AttendanceService>(AttendanceService);
  });

  it('should be defined', () => {
    expect(attendanceService).toBeDefined();
  });

  describe('Validate Access', () => {
    it('should not allow user outside school', async () => {
      try {
        await attendanceService.validateAccess({
          userId: anotherOutsideSchoolUserId,
          subjectId: subjectId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should not allow user outside subject', async () => {
      try {
        await attendanceService.validateAccess({
          userId: anotherOutsideSubjectUserId,
          subjectId: subjectId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should not allow user pending on school', async () => {
      try {
        await attendanceService.validateAccess({
          userId: pendingOnSchoolMemberUserId,
          subjectId: subjectId,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });

    it('should allow user on school and subject', async () => {
      await expect(
        attendanceService.validateAccess({
          userId: userId,
          subjectId: subjectId,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Get Attendance By ID', () => {
    it('should get attendance', async () => {
      const user = { id: userId } as User;
      const dto: GetAttendanceByIdDto = { attendanceId: attendanceId };
      const attendance = await attendanceService.getAttendanceById(dto, user);
      expect(attendance).toBeDefined();
    });
  });

  describe('Update Attendance', () => {
    it('should update attendance', async () => {
      const user = { id: userId } as User;
      const dto: UpdateAttendanceDto = {
        query: {
          attendanceId: attendanceId,
        },
        body: {
          absent: true,
          sick: false,
          present: false,
          holiday: false,
          late: false,
          note: 'test',
        },
      };

      const attendance = await attendanceService.updateAttendance(dto, user);
      expect(attendance.absent).toBe(true);
      expect(attendance.sick).toBe(false);
      expect(attendance.present).toBe(false);
      expect(attendance.holiday).toBe(false);
      expect(attendance.late).toBe(false);
      expect(attendance.note).toBe('test');
    });
  });

  it('should throw error when not found attendance to update', async () => {
    const user = { id: userId } as User;
    const dto: UpdateAttendanceDto = {
      query: {
        attendanceId: notFoundAttendanceId,
      },
      body: {
        absent: true,
        sick: false,
        present: false,
        holiday: false,
        late: false,
        note: 'test',
      },
    };

    try {
      await attendanceService.updateAttendance(dto, user);
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
    }
  });
});
