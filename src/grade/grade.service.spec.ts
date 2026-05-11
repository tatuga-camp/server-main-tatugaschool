import { Test, TestingModule } from '@nestjs/testing';
import { GradeService } from './grade.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubjectService } from '../subject/subject.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('GradeService', () => {
  let service: GradeService;

  const mockPrismaService = {};

  const mockSubjectService = {
    subjectRepository: {
      findUnique: jest.fn(),
    },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GradeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SubjectService, useValue: mockSubjectService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
      ],
    }).compile();

    service = module.get<GradeService>(GradeService);

    // Mock internal repository
    service.gradeRepository = {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignGrade', () => {
    it('should assign correct default grade', async () => {
      const result = await service.assignGrade(76);
      expect(result.grade).toBe('3.5');
    });

    it('should assign correct custom grade', async () => {
      const customRules = [
        { min: 90, max: 100, grade: 'A' },
        { min: 0, max: 89, grade: 'F' },
      ];

      const gradeRange = { gradeRules: JSON.stringify(customRules) };

      const result = await service.assignGrade(95, gradeRange as any);
      expect(result.grade).toBe('A');

      const result2 = await service.assignGrade(50, gradeRange as any);
      expect(result2.grade).toBe('F');
    });
  });

  describe('validateGradeRanges', () => {
    it('should pass valid ranges', () => {
      const ranges = [
        { min: 0, max: 49, grade: 'F' },
        { min: 50, max: 100, grade: 'A' },
      ];
      expect(service.validateGradeRanges(ranges)).toBe(true);
    });

    it('should throw if first min is not 0', () => {
      const ranges = [{ min: 10, max: 100, grade: 'A' }];
      expect(() => service.validateGradeRanges(ranges)).toThrow(
        BadRequestException,
      );
    });

    it('should throw if last max is not 100', () => {
      const ranges = [{ min: 0, max: 99, grade: 'A' }];
      expect(() => service.validateGradeRanges(ranges)).toThrow(
        BadRequestException,
      );
    });

    it('should throw on gaps', () => {
      const ranges = [
        { min: 0, max: 49, grade: 'F' },
        { min: 51, max: 100, grade: 'A' },
      ];
      expect(() => service.validateGradeRanges(ranges)).toThrow(
        BadRequestException,
      );
    });

    it('should throw on overlaps', () => {
      const ranges = [
        { min: 0, max: 50, grade: 'F' },
        { min: 50, max: 100, grade: 'A' },
      ];
      expect(() => service.validateGradeRanges(ranges)).toThrow(
        BadRequestException,
      );
    });

    it('should throw on invalid min/max', () => {
      const ranges = [
        { min: 0, max: -10, grade: 'F' },
        { min: -9, max: 100, grade: 'A' },
      ];
      expect(() => service.validateGradeRanges(ranges)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('should create grade successfully', async () => {
      const dto = {
        subjectId: 's1',
        gradeRanges: [
          { min: 0, max: 49, grade: 'F' },
          { min: 50, max: 100, grade: 'A' },
        ],
      };

      mockSubjectService.subjectRepository.findUnique.mockResolvedValue({
        id: 's1',
        schoolId: 'sch1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.gradeRepository.create as jest.Mock).mockResolvedValue({
        gradeRules: JSON.stringify(dto.gradeRanges),
      });

      const result = await service.create(dto, { id: 'u1' } as any);

      expect(service.gradeRepository.create).toHaveBeenCalled();
      expect(result.gradeRules).toEqual(dto.gradeRanges);
    });

    it('should throw NotFoundException if subject not found', async () => {
      mockSubjectService.subjectRepository.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ subjectId: 's1', gradeRanges: [] }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update grade successfully', async () => {
      const dto = {
        gradeRangeId: 'g1',
        gradeRange: [
          { min: 0, max: 49, grade: 'F' },
          { min: 50, max: 100, grade: 'A' },
        ],
      };

      (service.gradeRepository.findUnique as jest.Mock).mockResolvedValue({
        id: 'g1',
        subjectId: 's1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.gradeRepository.update as jest.Mock).mockResolvedValue({
        gradeRules: JSON.stringify(dto.gradeRange),
      });

      const result = await service.update(dto, { id: 'u1' } as any);

      expect(service.gradeRepository.update).toHaveBeenCalled();
      expect(result.gradeRules).toEqual(dto.gradeRange);
    });

    it('should throw NotFoundException if grade not found', async () => {
      (service.gradeRepository.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update({ gradeRangeId: 'g1', gradeRange: [] }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
