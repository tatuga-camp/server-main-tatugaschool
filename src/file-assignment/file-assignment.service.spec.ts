import { Test, TestingModule } from '@nestjs/testing';
import { FileAssignmentService } from './file-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { StripeService } from '../stripe/stripe.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('FileAssignmentService', () => {
  let service: FileAssignmentService;

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: {} },
        { provide: SubjectService, useValue: {} },
        { provide: ClassService, useValue: {} },
        { provide: StripeService, useValue: {} },
      ],
    }).compile();

    service = module.get<FileAssignmentService>(FileAssignmentService);

    // Mock internal repositories
    service.fileAssignmentRepository = {
      findMany: jest.fn(),
      getById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any;

    (service as any).assignmentRepository = {
      getById: jest.fn(),
    };

    (service as any).teacherOnSubjectRepository = {
      getByTeacherIdAndSubjectId: jest.fn(),
    };

    (service as any).schoolRepository = {
      getById: jest.fn(),
      update: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFilesByAssignmentId', () => {
    it('should return files if teacher has access', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1' },
      );
      (
        service.fileAssignmentRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'f1' }]);

      const result = await service.getFilesByAssignmentId(
        { assignmentId: 'a1' },
        { id: 'u1' } as any,
      );

      expect(result).toEqual([{ id: 'f1' }]);
    });

    it('should throw ForbiddenException if teacher does not have access', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        null,
      );

      await expect(
        service.getFilesByAssignmentId({ assignmentId: 'a1' }, {
          id: 'u1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateFile', () => {
    it('should update file successfully', async () => {
      (service.fileAssignmentRepository.getById as jest.Mock).mockResolvedValue(
        { id: 'f1', subjectId: 's1' },
      );
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1' },
      );
      (service.fileAssignmentRepository.update as jest.Mock).mockResolvedValue({
        id: 'f1',
        preventFastForward: true,
      });

      const result = await service.updateFile(
        { id: 'f1', preventFastForward: true } as any,
        { id: 'u1' } as any,
      );

      expect(service.fileAssignmentRepository.update).toHaveBeenCalled();
      expect(result.preventFastForward).toBe(true);
    });
  });

  describe('createFileAssignment', () => {
    it('should create file and update school storage', async () => {
      const mockAssignment = { id: 'a1', subjectId: 's1', schoolId: 'sch1' };
      (service as any).assignmentRepository.getById.mockResolvedValue(
        mockAssignment,
      );
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1' },
      );

      (service.fileAssignmentRepository.create as jest.Mock).mockResolvedValue({
        id: 'f1',
        size: 100,
      });
      (service as any).schoolRepository.getById.mockResolvedValue({
        id: 'sch1',
        totalStorage: 500,
      });
      (service as any).schoolRepository.update.mockResolvedValue({});

      const result = await service.createFileAssignment(
        { type: 'video/mp4', assignmentId: 'a1' } as any,
        { id: 'u1' } as any,
      );

      expect(service.fileAssignmentRepository.create).toHaveBeenCalled();
      expect((service as any).schoolRepository.update).toHaveBeenCalledWith({
        where: { id: 'sch1' },
        data: { totalStorage: 600 },
      });
      expect(result.id).toBe('f1');
    });

    it('should throw NotFoundException if image type without blurHash', async () => {
      const mockAssignment = { id: 'a1', subjectId: 's1', schoolId: 'sch1' };
      (service as any).assignmentRepository.getById.mockResolvedValue(
        mockAssignment,
      );

      await expect(
        service.createFileAssignment(
          { type: 'image/png', assignmentId: 'a1' } as any,
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFileAssignment', () => {
    it('should delete file and decrement school storage', async () => {
      (service.fileAssignmentRepository.getById as jest.Mock).mockResolvedValue(
        { id: 'f1', assignmentId: 'a1', size: 100 },
      );
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
        schoolId: 'sch1',
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1' },
      );

      (service.fileAssignmentRepository.delete as jest.Mock).mockResolvedValue(
        {},
      );
      (service as any).schoolRepository.update.mockResolvedValue({});

      const result = await service.deleteFileAssignment(
        { fileOnAssignmentId: 'f1' },
        { id: 'u1' } as any,
      );

      expect(service.fileAssignmentRepository.delete).toHaveBeenCalledWith({
        fileOnAssignmentId: 'f1',
      });
      expect((service as any).schoolRepository.update).toHaveBeenCalledWith({
        where: { id: 'sch1' },
        data: { totalStorage: { decrement: 100 } },
      });
      expect(result.id).toBe('f1');
    });
  });
});
