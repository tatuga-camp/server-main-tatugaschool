import { Test, TestingModule } from '@nestjs/testing';
import { StudentOnGroupService } from './student-on-group.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { UnitOnGroupService } from '../unit-on-group/unit-on-group.service';
import { StudentOnSubjectService } from '../student-on-subject/student-on-subject.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('StudentOnGroupService', () => {
  let service: StudentOnGroupService;

  const mockPrismaService = {
    subject: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockUnitOnGroupService = {
    unitOnGroupRepository: {
      findUnique: jest.fn(),
    },
  };

  const mockStudentOnSubjectService = {
    studentOnSubjectRepository: {
      getStudentOnSubjectById: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentOnGroupService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: UnitOnGroupService, useValue: mockUnitOnGroupService },
        {
          provide: StudentOnSubjectService,
          useValue: mockStudentOnSubjectService,
        },
      ],
    }).compile();

    service = module.get<StudentOnGroupService>(StudentOnGroupService);

    // Mock internal repository
    service.studentOnGroupRepository = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create student on group', async () => {
      mockUnitOnGroupService.unitOnGroupRepository.findUnique.mockResolvedValue(
        { id: 'u1', subjectId: 's1' },
      );
      mockStudentOnSubjectService.studentOnSubjectRepository.getStudentOnSubjectById.mockResolvedValue(
        { id: 'st1', subjectId: 's1', schoolId: 'sch1' },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.studentOnGroupRepository.create as jest.Mock).mockResolvedValue({
        id: 'sg1',
      });

      const result = await service.create(
        { unitOnGroupId: 'u1', studentOnSubjectId: 'st1' },
        { id: 'u1' } as any,
      );

      expect(service.studentOnGroupRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('sg1');
    });

    it('should throw BadRequestException if unit or student not found', async () => {
      mockUnitOnGroupService.unitOnGroupRepository.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.create(
          { unitOnGroupId: 'u1', studentOnSubjectId: 'st1' },
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if subjects mismatch', async () => {
      mockUnitOnGroupService.unitOnGroupRepository.findUnique.mockResolvedValue(
        { subjectId: 's1' },
      );
      mockStudentOnSubjectService.studentOnSubjectRepository.getStudentOnSubjectById.mockResolvedValue(
        { subjectId: 's2' },
      );

      await expect(
        service.create(
          { unitOnGroupId: 'u1', studentOnSubjectId: 'st1' },
          {} as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('should reorder students in group', async () => {
      (
        service.studentOnGroupRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'sg1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.studentOnGroupRepository.update as jest.Mock).mockResolvedValue({
        id: 'sg1',
        order: 0,
      });

      const result = await service.reorder({ studentOnGroupIds: ['sg1'] }, {
        id: 'u1',
      } as any);

      expect(service.studentOnGroupRepository.update).toHaveBeenCalledWith({
        where: { id: 'sg1' },
        data: { order: 0 },
      });
      expect(result[0].id).toBe('sg1');
    });
  });

  describe('update', () => {
    it('should update student in group', async () => {
      (
        service.studentOnGroupRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'sg1', subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.studentOnGroupRepository.update as jest.Mock).mockResolvedValue({
        id: 'sg1',
        title: 'New',
      });

      const result = await service.update(
        { query: { studentOnGroupId: 'sg1' }, body: { title: 'New' } } as any,
        { id: 'u1' } as any,
      );

      expect(service.studentOnGroupRepository.update).toHaveBeenCalled();
      expect(result.id).toBe('sg1');
    });
  });

  describe('delete', () => {
    it('should delete student in group', async () => {
      (
        service.studentOnGroupRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'sg1', subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.studentOnGroupRepository.delete as jest.Mock).mockResolvedValue({
        id: 'sg1',
      });

      const result = await service.delete({ studentOnGroupId: 'sg1' }, {
        id: 'u1',
      } as any);

      expect(service.studentOnGroupRepository.delete).toHaveBeenCalledWith({
        where: { id: 'sg1' },
      });
      expect(result.id).toBe('sg1');
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      (
        service.studentOnGroupRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'sg1', subjectId: 's1' });
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(
        service.delete({ studentOnGroupId: 'sg1' }, {} as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
