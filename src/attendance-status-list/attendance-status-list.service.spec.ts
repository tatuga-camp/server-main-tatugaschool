import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceStatusListService } from './attendance-status-list.service';
import { PrismaService } from '../prisma/prisma.service';
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

describe('AttendanceStatusListService', () => {
  let service: AttendanceStatusListService;

  const mockPrismaService = {
    subject: {
      findUnique: jest.fn(),
    },
    attendance: {
      updateMany: jest.fn(),
    },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceStatusListService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: RedisService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    service = module.get<AttendanceStatusListService>(
      AttendanceStatusListService,
    );

    // Mock internal repositories
    service.attendanceStatusListSRepository = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

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

  describe('create', () => {
    it('should create status successfully', async () => {
      const mockTable = { id: 't1', subjectId: 's1', schoolId: 'sch1' };
      const mockSubject = { id: 's1', isLocked: false };
      const mockUser = { id: 'u1' } as any;
      const dto: any = { attendanceTableId: 't1', title: 'New Status' };

      (service as any).attendanceTableRepository.findUnique.mockResolvedValue(
        mockTable,
      );
      mockPrismaService.subject.findUnique.mockResolvedValue(mockSubject);
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.attendanceStatusListSRepository.findMany as jest.Mock
      ).mockResolvedValue([]);
      (
        service.attendanceStatusListSRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'st1', title: 'New Status' });

      const result = await service.create(dto, mockUser);

      expect(service.attendanceStatusListSRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('st1');
    });

    it('should throw BadRequestException if title duplicates', async () => {
      (service as any).attendanceTableRepository.findUnique.mockResolvedValue({
        subjectId: 's1',
      });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        isLocked: false,
      });
      (
        service.attendanceStatusListSRepository.findMany as jest.Mock
      ).mockResolvedValue([{ title: 'Dup' }]);

      await expect(
        service.create({ title: 'Dup' } as any, {} as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update status and cascade to attendances', async () => {
      const mockStatus = {
        id: 'st1',
        subjectId: 's1',
        attendanceTableId: 't1',
        title: 'Old',
      };
      const dto: any = { query: { id: 'st1' }, body: { title: 'New' } };

      (
        service.attendanceStatusListSRepository.findUnique as jest.Mock
      ).mockResolvedValue(mockStatus);
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service.attendanceStatusListSRepository.findMany as jest.Mock
      ).mockResolvedValue([]);
      (
        service.attendanceStatusListSRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'st1', title: 'New' });

      const result = await service.update(dto, { id: 'u1' } as any);

      expect(service.attendanceStatusListSRepository.update).toHaveBeenCalled();
      expect(mockPrismaService.attendance.updateMany).toHaveBeenCalledWith({
        where: { attendanceTableId: 't1', status: 'Old' },
        data: { status: 'New' },
      });
      expect(result.title).toBe('New');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (
        service.attendanceStatusListSRepository.findUnique as jest.Mock
      ).mockResolvedValue({ subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        isLocked: true,
      });

      await expect(
        service.update({ query: { id: 'st1' } } as any, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should delete status successfully', async () => {
      (
        service.attendanceStatusListSRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'st1', subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      (
        service.attendanceStatusListSRepository.delete as jest.Mock
      ).mockResolvedValue({ id: 'st1' });

      const result = await service.delete(
        { id: 'st1' } as any,
        { id: 'u1' } as any,
      );

      expect(
        service.attendanceStatusListSRepository.delete,
      ).toHaveBeenCalledWith({ where: { id: 'st1' } });
      expect(result.id).toBe('st1');
    });

    it('should throw NotFoundException if status not found', async () => {
      (
        service.attendanceStatusListSRepository.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.delete({ id: 'st1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
