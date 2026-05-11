import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceTableService } from './attendance-table.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../redis/redis.service';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('googleapis', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));

describe('AttendanceTableService', () => {
  let service: AttendanceTableService;

  const mockPrismaService = {
    subject: { findUnique: jest.fn() },
    attendanceTable: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceTableService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: StorageService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<AttendanceTableService>(AttendanceTableService);

    // mock internal repositories
    service.attendanceTableRepository = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      createAttendanceTable: jest.fn(),
      updateAttendanceTable: jest.fn(),
      deleteAttendanceTable: jest.fn(),
    } as any;

    service.attendanceStatusListSRepository = {
      findMany: jest.fn(),
      create: jest.fn(),
    } as any;

    service.attendanceRowRepository = {
      findMany: jest.fn(),
    } as any;

    service.attendanceRepository = {
      findMany: jest.fn(),
    } as any;

    service.studentOnSubjectRepository = {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBySubjectId', () => {
    it('should return tables with status lists', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({ id: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.attendanceTableRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 't1' }]);
      (
        service.attendanceStatusListSRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'st1', attendanceTableId: 't1' }]);

      const result = await service.getBySubjectId(
        { subjectId: 's1' } as any,
        { id: 'u1' } as any,
      );

      expect(result).toEqual([
        { id: 't1', statusLists: [{ id: 'st1', attendanceTableId: 't1' }] },
      ]);
    });

    it('should throw NotFoundException if subject not found', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue(null);

      await expect(
        service.getBySubjectId({} as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAttendanceTable', () => {
    it('should create table and status lists', async () => {
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.attendanceTableRepository.createAttendanceTable as jest.Mock
      ).mockResolvedValue({ id: 't1' });
      (
        service.attendanceStatusListSRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'st1' });

      const result = await service.createAttendanceTable(
        { subjectId: 's1' } as any,
        { id: 'u1' } as any,
      );

      expect(
        service.attendanceTableRepository.createAttendanceTable,
      ).toHaveBeenCalled();
      expect(
        service.attendanceStatusListSRepository.create,
      ).toHaveBeenCalledTimes(5);
      expect(result.id).toBe('t1');
    });
  });

  describe('updateAttendanceTable', () => {
    it('should update attendance table', async () => {
      mockPrismaService.attendanceTable.findUnique.mockResolvedValue({
        id: 't1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.attendanceTableRepository.updateAttendanceTable as jest.Mock
      ).mockResolvedValue({ id: 't1', title: 'Updated' });

      const result = await service.updateAttendanceTable(
        { query: { attendanceTableId: 't1' } } as any,
        { id: 'u1' } as any,
      );

      expect(result.title).toBe('Updated');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      mockPrismaService.attendanceTable.findUnique.mockResolvedValue({
        id: 't1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.updateAttendanceTable({ query: {} } as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteAttendanceTable', () => {
    it('should delete attendance table', async () => {
      mockPrismaService.attendanceTable.findUnique.mockResolvedValue({
        id: 't1',
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.attendanceTableRepository.deleteAttendanceTable as jest.Mock
      ).mockResolvedValue({ id: 't1' });

      const result = await service.deleteAttendanceTable(
        { attendanceTableId: 't1' } as any,
        { id: 'u1' } as any,
      );

      expect(result.id).toBe('t1');
      expect(
        service.attendanceTableRepository.deleteAttendanceTable,
      ).toHaveBeenCalled();
    });
  });
});
