import { Test, TestingModule } from '@nestjs/testing';
import { FileOnStudentAssignmentService } from './file-on-student-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubjectService } from '../subject/subject.service';
import { ClassService } from '../class/class.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { StripeService } from '../stripe/stripe.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as archiver from 'archiver';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// Mock archiver
jest.mock('archiver', () => {
  return {
    create: jest.fn().mockReturnValue({
      append: jest.fn(),
      finalize: jest.fn(),
      abort: jest.fn(),
    }),
  };
});

describe('FileOnStudentAssignmentService', () => {
  let service: FileOnStudentAssignmentService;

  const mockPrismaService = {};

  const mockStorageService = {
    getFileStream: jest.fn(),
    DeleteFileOnStorage: jest.fn(),
  };

  const mockSubjectService = {
    subjectRepository: {
      getSubjectById: jest.fn(),
    },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileOnStudentAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: SubjectService, useValue: mockSubjectService },
        { provide: ClassService, useValue: {} },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: StripeService, useValue: {} },
      ],
    }).compile();

    service = module.get<FileOnStudentAssignmentService>(
      FileOnStudentAssignmentService,
    );

    // Mock internal repositories
    service.fileOnStudentAssignmentRepository = {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getById: jest.fn(),
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

    (service as any).studentOnAssignmentRepository = {
      findMany: jest.fn(),
      getById: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('downloadAllFiles', () => {
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
        service.downloadAllFiles({ assignmentId: 'a1' }, { id: 'u1' } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create zip archive and append files', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 'ts1', status: 'ACCEPT' },
      );
      (service as any).studentOnAssignmentRepository.findMany.mockResolvedValue(
        [
          {
            id: 'sa1',
            subjectId: 's1',
            number: 1,
            firstName: 'A',
            lastName: 'B',
          },
        ],
      );
      (
        service.fileOnStudentAssignmentRepository.findMany as jest.Mock
      ).mockResolvedValue([
        {
          id: 'f1',
          body: 'file.pdf',
          studentOnAssignmentId: 'sa1',
          contentType: 'FILE',
        },
      ]);
      mockStorageService.getFileStream.mockResolvedValue('mock-stream');

      const archive = await service.downloadAllFiles({ assignmentId: 'a1' }, {
        id: 'u1',
      } as any);

      expect(archiver.create).toHaveBeenCalledWith('zip', {
        zlib: { level: 9 },
      });
      // The logic uses async IIFE so we wait a tick
      await new Promise((r) => setTimeout(r, 10));
      expect(mockStorageService.getFileStream).toHaveBeenCalledWith('file.pdf');
      expect(archive.append).toHaveBeenCalled();
    });
  });

  describe('getFileByStudentOnAssignmentIdFromStudent', () => {
    it('should return files', async () => {
      (service as any).studentOnAssignmentRepository.getById.mockResolvedValue({
        studentId: 'st1',
      });
      (
        service.fileOnStudentAssignmentRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'f1' }]);

      const result = await service.getFileByStudentOnAssignmentIdFromStudent(
        { studentOnAssignmentId: 'sa1' },
        { id: 'st1' } as any,
      );

      expect(result[0].id).toBe('f1');
    });

    it('should throw ForbiddenException if unauthorized', async () => {
      (service as any).studentOnAssignmentRepository.getById.mockResolvedValue({
        studentId: 'st1',
      });

      await expect(
        service.getFileByStudentOnAssignmentIdFromStudent(
          { studentOnAssignmentId: 'sa1' },
          { id: 'st2' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getFileByStudentOnAssignmentIdFromTeacher', () => {
    it('should return files', async () => {
      (service as any).studentOnAssignmentRepository.getById.mockResolvedValue({
        id: 'sa1',
        subjectId: 's1',
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        { id: 't1' },
      );
      (
        service.fileOnStudentAssignmentRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'f1' }]);

      const result = await service.getFileByStudentOnAssignmentIdFromTeacher(
        { studentOnAssignmentId: 'sa1' },
        { id: 'u1' } as any,
      );

      expect(result[0].id).toBe('f1');
    });

    it('should throw ForbiddenException if not teacher in subject', async () => {
      (service as any).studentOnAssignmentRepository.getById.mockResolvedValue({
        id: 'sa1',
        subjectId: 's1',
      });
      (
        service as any
      ).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue(
        null,
      );

      await expect(
        service.getFileByStudentOnAssignmentIdFromTeacher(
          { studentOnAssignmentId: 'sa1' },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createFileOnStudentAssignmentFromStudent', () => {
    it('should create file and update school storage', async () => {
      const dto: any = { type: 'video/mp4', studentOnAssignmentId: 'sa1' };
      (service as any).studentOnAssignmentRepository.getById.mockResolvedValue({
        id: 'sa1',
        studentId: 'st1',
        assignmentId: 'a1',
        schoolId: 'sch1',
        subjectId: 's1',
      });
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
      });

      (
        service.fileOnStudentAssignmentRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'f1', size: 100 });
      (service as any).schoolRepository.getById.mockResolvedValue({
        id: 'sch1',
        totalStorage: 500,
      });

      const result = await service.createFileOnStudentAssignmentFromStudent(
        dto,
        { id: 'st1' } as any,
      );

      expect(
        service.fileOnStudentAssignmentRepository.create,
      ).toHaveBeenCalled();
      expect((service as any).schoolRepository.update).toHaveBeenCalledWith({
        where: { id: 'sch1' },
        data: { totalStorage: 600 },
      });
      expect(result.id).toBe('f1');
    });

    it('should throw BadRequestException if image without blurHash', async () => {
      await expect(
        service.createFileOnStudentAssignmentFromStudent(
          { type: 'image/png' } as any,
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateFile', () => {
    it('should update file and handle old file deletion', async () => {
      const mockFile = {
        id: 'f1',
        subjectId: 's1',
        studentId: 'st1',
        contentType: 'FILE',
        body: 'old-body',
      };
      (
        service.fileOnStudentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(mockFile);

      (
        service.fileOnStudentAssignmentRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'f1' });

      const result = await service.updateFile(
        { query: { id: 'f1' }, body: { body: 'new-body' } },
        null,
        { id: 'st1' } as any,
      );

      expect(
        service.fileOnStudentAssignmentRepository.update,
      ).toHaveBeenCalled();
      expect(mockStorageService.DeleteFileOnStorage).toHaveBeenCalledWith({
        fileName: 'old-body',
      });
      expect(result.id).toBe('f1');
    });

    it('should throw ForbiddenException if wrong student', async () => {
      (
        service.fileOnStudentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ studentId: 'st1' });

      await expect(
        service.updateFile({ query: { id: 'f1' }, body: {} }, null, {
          id: 'st2',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('does not delete storage when renaming a FILE without a new body', async () => {
      const file = {
        id: 'f1', subjectId: 's1', studentId: 'stu1',
        contentType: 'FILE', body: 'schools/s1/original.pdf',
      };
      (service.fileOnStudentAssignmentRepository.getById as jest.Mock).mockResolvedValue(file);
      (service as any).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue({ id: 't1' });
      (service.fileOnStudentAssignmentRepository.update as jest.Mock).mockResolvedValue({ ...file, name: 'Final essay' });

      await service.updateFile(
        { query: { id: 'f1' }, body: { name: 'Final essay' } } as any,
        { id: 'teacher1' } as any,
        null,
      );

      expect(mockStorageService.DeleteFileOnStorage).not.toHaveBeenCalled();
    });

    it('deletes the old storage file only when a different body is provided', async () => {
      const file = {
        id: 'f1', subjectId: 's1', studentId: 'stu1',
        contentType: 'FILE', body: 'schools/s1/original.pdf',
      };
      (service.fileOnStudentAssignmentRepository.getById as jest.Mock).mockResolvedValue(file);
      (service as any).teacherOnSubjectRepository.getByTeacherIdAndSubjectId.mockResolvedValue({ id: 't1' });
      (service.fileOnStudentAssignmentRepository.update as jest.Mock).mockResolvedValue(file);

      await service.updateFile(
        { query: { id: 'f1' }, body: { body: 'schools/s1/new.pdf' } } as any,
        { id: 'teacher1' } as any,
        null,
      );

      expect(mockStorageService.DeleteFileOnStorage).toHaveBeenCalledWith({
        fileName: 'schools/s1/original.pdf',
      });
    });
  });

  describe('delete', () => {
    it('should delete file successfully if student allowed', async () => {
      const mockFile = {
        id: 'f1',
        studentId: 'st1',
        subjectId: 's1',
        assignmentId: 'a1',
        schoolId: 'sch1',
        size: 100,
      };
      (
        service.fileOnStudentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(mockFile);
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
      });
      mockSubjectService.subjectRepository.getSubjectById.mockResolvedValue({
        allowStudentDeleteWork: true,
      });
      (
        service.fileOnStudentAssignmentRepository.delete as jest.Mock
      ).mockResolvedValue(mockFile);

      const result = await service.delete(
        { fileOnStudentAssignmentId: 'f1' },
        null,
        { id: 'st1' } as any,
      );

      expect(
        service.fileOnStudentAssignmentRepository.delete,
      ).toHaveBeenCalledWith({ fileOnStudentAssignmentId: 'f1' });
      expect((service as any).schoolRepository.update).toHaveBeenCalledWith({
        where: { id: 'sch1' },
        data: { totalStorage: { decrement: 100 } },
      });
      expect(result.id).toBe('f1');
    });

    it('should throw ForbiddenException if subject does not allow student to delete', async () => {
      const mockFile = {
        id: 'f1',
        studentId: 'st1',
        subjectId: 's1',
        assignmentId: 'a1',
      };
      (
        service.fileOnStudentAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(mockFile);
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
      });
      mockSubjectService.subjectRepository.getSubjectById.mockResolvedValue({
        allowStudentDeleteWork: false,
      });

      await expect(
        service.delete({ fileOnStudentAssignmentId: 'f1' }, null, {
          id: 'st1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
