import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { AttendanceRowService } from '../attendance-row/attendance-row.service';
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

describe('AttendanceService', () => {
  let service: AttendanceService;

  const mockPrismaService = {
    memberOnSchool: { findFirst: jest.fn() },
    teacherOnSubject: { findFirst: jest.fn() },
    subject: { findUnique: jest.fn() },
  };

  const mockStorageService = {};
  const mockStudentOnSubjectService = {
    getStudentOnSubjectsBySubjectId: jest.fn(),
  };
  const mockAttendanceTableService = { getBySubjectId: jest.fn() };
  const mockAttendanceRowService = {};
  const mockRedisService = {};
  const mockPrismaReadService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: StudentOnSubjectService,
          useValue: mockStudentOnSubjectService,
        },
        {
          provide: AttendanceTableService,
          useValue: mockAttendanceTableService,
        },
        { provide: AttendanceRowService, useValue: mockAttendanceRowService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaReadService, useValue: mockPrismaReadService },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);

    // Mock internal repositories
    service.attendanceRepository = {
      getAttendanceById: jest.fn(),
      create: jest.fn(),
      updateAttendanceById: jest.fn(),
      findMany: jest.fn(),
    } as any;

    (service as any).subjectRepository = {
      getSubjectById: jest.fn(),
    };

    (service as any).attendanceStatusListSRepository = {
      findMany: jest.fn(),
    };

    (service as any).attendanceRowRepository = {
      getAttendanceRowById: jest.fn(),
      findMany: jest.fn(),
    };

    (service as any).studentOnSubjectRepository = {
      getStudentOnSubjectById: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAccess', () => {
    it('should pass validation if user is admin or valid teacher', async () => {
      (service as any).subjectRepository.getSubjectById.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        status: 'ACCEPT',
        role: 'ADMIN',
      });
      mockPrismaService.teacherOnSubject.findFirst.mockResolvedValue(null);

      await expect(
        service.validateAccess({ userId: 'u1', subjectId: 's1' }),
      ).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException if not authorized', async () => {
      (service as any).subjectRepository.getSubjectById.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        status: 'ACCEPT',
        role: 'USER',
      });
      mockPrismaService.teacherOnSubject.findFirst.mockResolvedValue(null);

      await expect(
        service.validateAccess({ userId: 'u1', subjectId: 's1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAttendanceById', () => {
    it('should return attendance', async () => {
      const mockAttendance = { id: 'a1', subjectId: 's1' };
      (
        service.attendanceRepository.getAttendanceById as jest.Mock
      ).mockResolvedValue(mockAttendance);
      jest.spyOn(service, 'validateAccess').mockResolvedValue(undefined);

      const result = await service.getAttendanceById({ attendanceId: 'a1' }, {
        id: 'u1',
      } as any);

      expect(
        service.attendanceRepository.getAttendanceById,
      ).toHaveBeenCalledWith({ attendanceId: 'a1' });
      expect(result).toEqual(mockAttendance);
    });

    it('should throw NotFoundException if not found', async () => {
      (
        service.attendanceRepository.getAttendanceById as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.getAttendanceById({ attendanceId: 'a1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create attendance successfully', async () => {
      const mockRow = {
        id: 'r1',
        subjectId: 's1',
        attendanceTableId: 't1',
        startDate: new Date(),
        endDate: new Date(),
      };
      const mockStudent = {
        id: 'st1',
        studentId: 'std1',
        schoolId: 'sch1',
        subjectId: 's1',
      };
      const mockSubject = { id: 's1', isLocked: false };

      (
        service as any
      ).attendanceRowRepository.getAttendanceRowById.mockResolvedValue(mockRow);
      (
        service as any
      ).studentOnSubjectRepository.getStudentOnSubjectById.mockResolvedValue(
        mockStudent,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      jest.spyOn(service, 'validateAccess').mockResolvedValue(undefined);
      (
        service as any
      ).attendanceStatusListSRepository.findMany.mockResolvedValue([
        { title: 'Present' },
      ]);
      (service.attendanceRepository.create as jest.Mock).mockResolvedValue({
        id: 'att1',
      });

      const result = await service.create(
        {
          attendanceRowId: 'r1',
          studentOnSubjectId: 'st1',
          status: 'Present',
        } as any,
        { id: 'u1' } as any,
      );

      expect(service.attendanceRepository.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'att1' });
    });

    it('should throw NotFoundException if student not found', async () => {
      (
        service as any
      ).attendanceRowRepository.getAttendanceRowById.mockResolvedValue({});
      (
        service as any
      ).studentOnSubjectRepository.getStudentOnSubjectById.mockResolvedValue(
        null,
      );

      await expect(service.create({} as any, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update attendance successfully', async () => {
      const mockAttendance = {
        id: 'a1',
        subjectId: 's1',
        attendanceTableId: 't1',
      };
      (
        service.attendanceRepository.getAttendanceById as jest.Mock
      ).mockResolvedValue(mockAttendance);
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      jest.spyOn(service, 'validateAccess').mockResolvedValue(undefined);
      (
        service as any
      ).attendanceStatusListSRepository.findMany.mockResolvedValue([
        { title: 'Present' },
      ]);
      (
        service.attendanceRepository.updateAttendanceById as jest.Mock
      ).mockResolvedValue({ id: 'a1', status: 'Present' });

      const result = await service.update(
        { query: { attendanceId: 'a1' }, body: { status: 'Present' } } as any,
        { id: 'u1' } as any,
      );

      expect(
        service.attendanceRepository.updateAttendanceById,
      ).toHaveBeenCalled();
      expect(result.status).toBe('Present');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (
        service.attendanceRepository.getAttendanceById as jest.Mock
      ).mockResolvedValue({ subjectId: 's1' });
      jest.spyOn(service, 'validateAccess').mockResolvedValue(undefined);
      mockPrismaService.subject.findUnique.mockResolvedValue({
        isLocked: true,
      });

      await expect(
        service.update(
          { query: { attendanceId: 'a1' } } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
