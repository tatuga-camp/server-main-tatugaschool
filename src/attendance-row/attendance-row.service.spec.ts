import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceRowService } from './attendance-row.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SubjectService } from '../subject/subject.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { CacheService } from '../cache/cache.service';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';
import { PrismaReadService } from '../prisma/prisma-read.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('googleapis', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));

describe('AttendanceRowService', () => {
  let service: AttendanceRowService;

  const mockPrismaService = {
    attendanceTable: { findUnique: jest.fn() },
    subject: { findUnique: jest.fn() },
    attendanceRow: { findUnique: jest.fn(), findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
  };

  const mockStudentOnSubjectService = {
    studentOnSubjectRepository: { findMany: jest.fn() },
  };

  const mockSubjectService = {
    subjectRepository: { findUnique: jest.fn() },
  };

  const mockAttendanceStatusListService = {
    attendanceStatusListSRepository: { findMany: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceRowService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: StudentOnSubjectService,
          useValue: mockStudentOnSubjectService,
        },
        { provide: SubjectService, useValue: mockSubjectService },
        {
          provide: AttendanceStatusListService,
          useValue: mockAttendanceStatusListService,
        },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: CacheService, useValue: createPassthroughCache() },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<AttendanceRowService>(AttendanceRowService);

    // mock internal repositories
    service.attendanceRowRepository = {
      findMany: jest.fn(),
      getAttendanceRowById: jest.fn(),
      createAttendanceRow: jest.fn(),
      updateAttendanceRow: jest.fn(),
      deleteAttendanceRow: jest.fn(),
    } as any;

    (service as any).attendanceRepository = {
      findMany: jest.fn(),
    };

    (service as any).attendanceTableRepository = {
      findUnique: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('GetAttendanceRows', () => {
    const dto: any = { attendanceTableId: 't1' };
    const user: any = { id: 'u1' };
    let refs: { attendanceTable: jest.Mock };
    let attendanceReads: { tableRows: jest.Mock };

    beforeEach(() => {
      refs = {
        attendanceTable: jest.fn().mockResolvedValue({ subjectId: 's1' }),
      };
      attendanceReads = { tableRows: jest.fn().mockResolvedValue([]) };
      (service as any).refs = refs;
      (service as any).attendanceReads = attendanceReads;
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue({
        id: 'ts1',
        status: 'ACCEPT',
      });
    });

    afterEach(() => {
      mockTeacherOnSubjectService.ValidateAccess.mockReset();
    });

    it('should return rows with attendances from the cache unit', async () => {
      const rows = [
        { id: 'r1', attendances: [{ attendanceRowId: 'r1', id: 'a1' }] },
      ];
      attendanceReads.tableRows.mockResolvedValue(rows);

      const result = await service.GetAttendanceRows(dto, user);

      expect(result).toEqual(rows);
      expect(refs.attendanceTable).toHaveBeenCalledWith('t1');
      expect(attendanceReads.tableRows).toHaveBeenCalledWith('s1', 't1');
    });

    it("should call ValidateAccess with the table ref's subjectId", async () => {
      await service.GetAttendanceRows(dto, user);

      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
    });

    it('should authorize on every request, before reading cached attendance', async () => {
      await service.GetAttendanceRows(dto, user);
      await service.GetAttendanceRows(dto, user);

      const access = mockTeacherOnSubjectService.ValidateAccess.mock;
      const read = attendanceReads.tableRows.mock;
      expect(access.calls).toHaveLength(2);
      expect(read.calls).toHaveLength(2);
      for (const i of [0, 1]) {
        expect(access.invocationCallOrder[i]).toBeLessThan(
          read.invocationCallOrder[i],
        );
      }
    });

    it('should throw NotFoundException if table not found', async () => {
      refs.attendanceTable.mockResolvedValue(null);

      await expect(service.GetAttendanceRows(dto, user)).rejects.toThrow(
        new NotFoundException('Attendance table not found'),
      );
      expect(mockTeacherOnSubjectService.ValidateAccess).not.toHaveBeenCalled();
      expect(attendanceReads.tableRows).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for a deleted table whose ref is still cached', async () => {
      attendanceReads.tableRows.mockResolvedValue(null);

      await expect(service.GetAttendanceRows(dto, user)).rejects.toThrow(
        new NotFoundException('Attendance table not found'),
      );
      expect(attendanceReads.tableRows).toHaveBeenCalledWith('s1', 't1');
    });

    it('should not read cached attendance when the access check rejects', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException("You're not a teacher on this subject"),
      );

      await expect(service.GetAttendanceRows(dto, user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(attendanceReads.tableRows).not.toHaveBeenCalled();
    });

    it('should not read the table, rows or attendances through Prisma or repositories', async () => {
      await service.GetAttendanceRows(dto, user);

      expect(
        mockPrismaService.attendanceTable.findUnique,
      ).not.toHaveBeenCalled();
      expect(service.attendanceRowRepository.findMany).not.toHaveBeenCalled();
      expect(
        (service as any).attendanceRepository.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('GetAttendanceRows cache wiring', () => {
    it('builds its refs and reads on the primary Prisma client', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockPrismaService.attendanceTable.findUnique
        .mockResolvedValueOnce({ subjectId: 's1' })
        .mockResolvedValueOnce({ id: 't1' });
      mockPrismaService.attendanceRow.findMany.mockResolvedValueOnce([
        { id: 'r1' },
      ]);
      mockPrismaService.attendance.findMany.mockResolvedValueOnce([
        { id: 'a1', attendanceRowId: 'r1' },
      ]);

      const result = await service.GetAttendanceRows(
        { attendanceTableId: 't1' } as any,
        { id: 'u1' } as any,
      );

      expect(result).toEqual([
        { id: 'r1', attendances: [{ id: 'a1', attendanceRowId: 'r1' }] },
      ]);
      expect(mockPrismaService.attendanceTable.findUnique).toHaveBeenCalledWith(
        { where: { id: 't1' }, select: { subjectId: true } },
      );
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
    });
  });

  describe('GetAttendanceRowById', () => {
    it('should return attendance row', async () => {
      const dto: any = { attendanceRowId: 'r1' };
      const user: any = { id: 'u1' };
      const mockRow = { id: 'r1', subjectId: 's1' };

      (
        service.attendanceRowRepository.getAttendanceRowById as jest.Mock
      ).mockResolvedValue(mockRow);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      const result = await service.GetAttendanceRowById(dto, user);

      expect(result).toEqual(mockRow);
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
    });
  });

  describe('CreateAttendanceRow', () => {
    it('should create attendance row successfully', async () => {
      const dto: any = { attendanceTableId: 't1', type: 'MANUAL' };
      const user: any = { id: 'u1' };

      (service as any).attendanceTableRepository.findUnique.mockResolvedValue({
        id: 't1',
        subjectId: 's1',
        schoolId: 'sch1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      (
        service.attendanceRowRepository.createAttendanceRow as jest.Mock
      ).mockResolvedValue({ id: 'r1' });
      (service as any).attendanceRepository.findMany.mockResolvedValue([]);

      const result = await service.CreateAttendanceRow(dto, user);

      expect(
        service.attendanceRowRepository.createAttendanceRow,
      ).toHaveBeenCalled();
      expect(result.id).toBe('r1');
      expect(result.attendances).toEqual([]);
    });

    it('should throw BadRequestException if type SCAN misses params', async () => {
      const dto: any = { attendanceTableId: 't1', type: 'SCAN' }; // missing allowScanAt etc.

      (service as any).attendanceTableRepository.findUnique.mockResolvedValue({
        id: 't1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);

      await expect(service.CreateAttendanceRow(dto, {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('UpdateAttendanceRow', () => {
    it('should update attendance row', async () => {
      const dto: any = { query: { attendanceRowId: 'r1' }, data: {} };
      const user: any = { id: 'u1' };

      mockPrismaService.attendanceRow.findUnique.mockResolvedValue({
        id: 'r1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.attendanceRowRepository.updateAttendanceRow as jest.Mock
      ).mockResolvedValue({ id: 'r1', updated: true });

      const result = await service.UpdateAttendanceRow(dto, user);

      expect(
        service.attendanceRowRepository.updateAttendanceRow,
      ).toHaveBeenCalledWith(dto);
      expect(result.id).toBe('r1');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      mockPrismaService.attendanceRow.findUnique.mockResolvedValue({
        id: 'r1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.UpdateAttendanceRow({ query: {} } as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DeleteAttendanceRow', () => {
    it('should delete attendance row', async () => {
      const dto: any = { attendanceRowId: 'r1' };
      const user: any = { id: 'u1' };

      mockPrismaService.attendanceRow.findUnique.mockResolvedValue({
        id: 'r1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.attendanceRowRepository.deleteAttendanceRow as jest.Mock
      ).mockResolvedValue({ id: 'r1' });

      const result = await service.DeleteAttendanceRow(dto, user);

      expect(
        service.attendanceRowRepository.deleteAttendanceRow,
      ).toHaveBeenCalledWith({ attendanceRowId: 'r1' });
      expect(result.id).toBe('r1');
    });
  });
});
