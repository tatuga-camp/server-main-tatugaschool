import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceRowService } from './attendance-row.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { SubjectService } from '../subject/subject.service';
import { AttendanceStatusListService } from '../attendance-status-list/attendance-status-list.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { RedisService } from '../redis/redis.service';
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
    attendanceRow: { findUnique: jest.fn() },
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
        { provide: RedisService, useValue: {} },
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
    it('should return rows with attendances successfully', async () => {
      const dto: any = { attendanceTableId: 't1' };
      const user: any = { id: 'u1' };

      mockPrismaService.attendanceTable.findUnique.mockResolvedValue({
        id: 't1',
        subjectId: 's1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.attendanceRowRepository.findMany as jest.Mock).mockResolvedValue(
        [{ id: 'r1' }],
      );
      (service as any).attendanceRepository.findMany.mockResolvedValue([
        { attendanceRowId: 'r1', id: 'a1' },
      ]);

      const result = await service.GetAttendanceRows(dto, user);

      expect(result).toEqual([
        { id: 'r1', attendances: [{ attendanceRowId: 'r1', id: 'a1' }] },
      ]);
    });

    it('should throw NotFoundException if table not found', async () => {
      mockPrismaService.attendanceTable.findUnique.mockResolvedValue(null);

      await expect(
        service.GetAttendanceRows({} as any, {} as any),
      ).rejects.toThrow(NotFoundException);
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
