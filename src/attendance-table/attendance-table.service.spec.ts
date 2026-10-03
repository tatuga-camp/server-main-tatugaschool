import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceTableService } from './attendance-table.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StorageService } from '../storage/storage.service';
import { CacheService } from '../cache/cache.service';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';
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
    attendanceTable: { findUnique: jest.fn(), findMany: jest.fn() },
    attendanceStatusList: { findMany: jest.fn() },
    studentOnSubject: { findFirst: jest.fn() },
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
        { provide: CacheService, useValue: createPassthroughCache() },
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
    const dto: any = { subjectId: 's1' };
    const user: any = { id: 'u1' };
    let refs: { subject: jest.Mock };
    let attendanceReads: { tables: jest.Mock };

    beforeEach(() => {
      refs = { subject: jest.fn().mockResolvedValue({ schoolId: 'sch1' }) };
      attendanceReads = { tables: jest.fn().mockResolvedValue([]) };
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

    it('should return tables with status lists from the cache unit', async () => {
      const tables = [
        { id: 't1', statusLists: [{ id: 'st1', attendanceTableId: 't1' }] },
      ];
      attendanceReads.tables.mockResolvedValue(tables);

      const result = await service.getBySubjectId(dto, user);

      expect(result).toEqual(tables);
      expect(refs.subject).toHaveBeenCalledWith('s1');
      expect(mockTeacherOnSubjectService.ValidateAccess).toHaveBeenCalledWith({
        userId: 'u1',
        subjectId: 's1',
      });
      expect(attendanceReads.tables).toHaveBeenCalledWith('s1');
    });

    it('should authorize on every request, before reading cached attendance', async () => {
      await service.getBySubjectId(dto, user);
      await service.getBySubjectId(dto, user);

      const access = mockTeacherOnSubjectService.ValidateAccess.mock;
      const read = attendanceReads.tables.mock;
      expect(access.calls).toHaveLength(2);
      expect(read.calls).toHaveLength(2);
      for (const i of [0, 1]) {
        expect(access.invocationCallOrder[i]).toBeLessThan(
          read.invocationCallOrder[i],
        );
      }
    });

    it('should throw NotFoundException if subject not found', async () => {
      refs.subject.mockResolvedValue(null);

      await expect(service.getBySubjectId(dto, user)).rejects.toThrow(
        new NotFoundException('Subject not found'),
      );
      expect(mockTeacherOnSubjectService.ValidateAccess).not.toHaveBeenCalled();
      expect(attendanceReads.tables).not.toHaveBeenCalled();
    });

    it('should not read cached attendance when the access check rejects', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockRejectedValue(
        new ForbiddenException("You're not a teacher on this subject"),
      );

      await expect(service.getBySubjectId(dto, user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(attendanceReads.tables).not.toHaveBeenCalled();
    });

    it('should not read the subject, tables or status lists through Prisma or repositories', async () => {
      await service.getBySubjectId(dto, user);

      expect(mockPrismaService.subject.findUnique).not.toHaveBeenCalled();
      expect(service.attendanceTableRepository.findMany).not.toHaveBeenCalled();
      expect(
        service.attendanceStatusListSRepository.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getBySubjectIdOnStudentOnSubject', () => {
    const dto = { subjectId: 's1', studentId: 'st1' };
    const student: any = { id: 'st1' };
    let reads: { enrollment: jest.Mock };
    let attendanceReads: { tables: jest.Mock; studentAttendance: jest.Mock };

    beforeEach(() => {
      reads = {
        enrollment: jest
          .fn()
          .mockResolvedValue({ id: 'sos1', subjectId: 's1', studentId: 'st1' }),
      };
      attendanceReads = {
        tables: jest.fn().mockResolvedValue([]),
        studentAttendance: jest
          .fn()
          .mockResolvedValue({ rows: [], attendances: [] }),
      };
      (service as any).reads = reads;
      (service as any).attendanceReads = attendanceReads;
    });

    it("should merge the cached tables with this student's rows and attendances", async () => {
      attendanceReads.tables.mockResolvedValue([
        {
          id: 't1',
          title: 'Term 1',
          statusLists: [{ id: 'st-1', attendanceTableId: 't1' }],
        },
        {
          id: 't2',
          title: 'Term 2',
          statusLists: [{ id: 'st-2', attendanceTableId: 't2' }],
        },
      ]);
      attendanceReads.studentAttendance.mockResolvedValue({
        rows: [
          { id: 'r1', attendanceTableId: 't1' },
          { id: 'r2', attendanceTableId: 't2' },
          { id: 'r3', attendanceTableId: 't1' },
        ],
        attendances: [{ id: 'a1', attendanceTableId: 't1' }],
      });

      const result = await service.getBySubjectIdOnStudentOnSubject(
        dto,
        student,
      );

      expect(result).toEqual([
        {
          id: 't1',
          title: 'Term 1',
          rows: [
            { id: 'r1', attendanceTableId: 't1' },
            { id: 'r3', attendanceTableId: 't1' },
          ],
          attendances: [{ id: 'a1', attendanceTableId: 't1' }],
          statusLists: [{ id: 'st-1', attendanceTableId: 't1' }],
        },
        {
          id: 't2',
          title: 'Term 2',
          rows: [{ id: 'r2', attendanceTableId: 't2' }],
          attendances: [],
          statusLists: [{ id: 'st-2', attendanceTableId: 't2' }],
        },
      ]);
      // Same key order as before caching: table fields, rows, attendances, statusLists.
      expect(Object.keys(result[0])).toEqual([
        'id',
        'title',
        'rows',
        'attendances',
        'statusLists',
      ]);
    });

    it("should read the enrolment and only this student's attendance", async () => {
      await service.getBySubjectIdOnStudentOnSubject(dto, student);

      expect(reads.enrollment).toHaveBeenCalledWith('s1', 'st1');
      expect(attendanceReads.tables).toHaveBeenCalledWith('s1');
      expect(attendanceReads.studentAttendance).toHaveBeenCalledWith(
        's1',
        'sos1',
      );
    });

    it('should refuse another student before reading anything', async () => {
      await expect(
        service.getBySubjectIdOnStudentOnSubject(dto, { id: 'st2' } as any),
      ).rejects.toThrow(
        new ForbiddenException("You don't have access to this student"),
      );
      expect(reads.enrollment).not.toHaveBeenCalled();
      expect(attendanceReads.tables).not.toHaveBeenCalled();
      expect(attendanceReads.studentAttendance).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when the student is not enrolled', async () => {
      reads.enrollment.mockResolvedValue(null);

      await expect(
        service.getBySubjectIdOnStudentOnSubject(dto, student),
      ).rejects.toThrow(new ForbiddenException('Student not found'));
      expect(attendanceReads.tables).not.toHaveBeenCalled();
      expect(attendanceReads.studentAttendance).not.toHaveBeenCalled();
    });

    it('should check the enrolment on every request, before reading cached attendance', async () => {
      await service.getBySubjectIdOnStudentOnSubject(dto, student);
      await service.getBySubjectIdOnStudentOnSubject(dto, student);

      const check = reads.enrollment.mock;
      const read = attendanceReads.studentAttendance.mock;
      expect(check.calls).toHaveLength(2);
      expect(read.calls).toHaveLength(2);
      for (const i of [0, 1]) {
        expect(check.invocationCallOrder[i]).toBeLessThan(
          read.invocationCallOrder[i],
        );
        expect(check.invocationCallOrder[i]).toBeLessThan(
          attendanceReads.tables.mock.invocationCallOrder[i],
        );
      }
    });

    it('should not read the enrolment, tables, rows or attendances through repositories', async () => {
      await service.getBySubjectIdOnStudentOnSubject(dto, student);

      expect(
        service.studentOnSubjectRepository.findFirst,
      ).not.toHaveBeenCalled();
      expect(service.attendanceTableRepository.findMany).not.toHaveBeenCalled();
      expect(service.attendanceRowRepository.findMany).not.toHaveBeenCalled();
      expect(service.attendanceRepository.findMany).not.toHaveBeenCalled();
      expect(
        service.attendanceStatusListSRepository.findMany,
      ).not.toHaveBeenCalled();
    });
  });

  describe('attendance cache wiring', () => {
    it('builds its refs and reads on the primary Prisma client', async () => {
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      mockPrismaService.subject.findUnique.mockResolvedValueOnce({
        schoolId: 'sch1',
      });
      mockPrismaService.attendanceTable.findMany.mockResolvedValueOnce([
        { id: 't1' },
      ]);
      mockPrismaService.attendanceStatusList.findMany.mockResolvedValueOnce([
        { id: 'st1', attendanceTableId: 't1' },
      ]);

      const result = await service.getBySubjectId(
        { subjectId: 's1' } as any,
        { id: 'u1' } as any,
      );

      expect(result).toEqual([
        { id: 't1', statusLists: [{ id: 'st1', attendanceTableId: 't1' }] },
      ]);
      expect(mockPrismaService.subject.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
        select: { schoolId: true },
      });
    });

    it('reads the enrolment for the student view on the primary Prisma client', async () => {
      mockPrismaService.studentOnSubject.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getBySubjectIdOnStudentOnSubject(
          { subjectId: 's1', studentId: 'st1' },
          { id: 'st1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.studentOnSubject.findFirst).toHaveBeenCalledWith(
        { where: { subjectId: 's1', studentId: 'st1' } },
      );
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
