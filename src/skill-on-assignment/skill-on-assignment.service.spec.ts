import { Test, TestingModule } from '@nestjs/testing';
import { SkillOnAssignmentService } from './skill-on-assignment.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('SkillOnAssignmentService', () => {
  let service: SkillOnAssignmentService;

  const mockPrismaService = {};
  const mockStorageService = {};
  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillOnAssignmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
      ],
    }).compile();

    service = module.get<SkillOnAssignmentService>(SkillOnAssignmentService);

    service.skillOnAssignmentRepository = {
      getByAssignmentId: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      delete: jest.fn(),
    } as any;

    (service as any).assignmentRepository = {
      getById: jest.fn(),
    };

    (service as any).skillRepository = {
      findMany: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getByAssignmentId', () => {
    it('should return skills on assignment with skill details', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.skillOnAssignmentRepository.getByAssignmentId as jest.Mock
      ).mockResolvedValue([{ id: 'sa1', skillId: 'sk1' }]);
      (service as any).skillRepository.findMany.mockResolvedValue([
        { id: 'sk1', vector: [0.1] },
      ]);

      const result = await service.getByAssignmentId({ assignmentId: 'a1' }, {
        id: 'u1',
      } as any);

      expect(result[0].id).toBe('sa1');
      expect(result[0].skill.id).toBe('sk1');
      expect(result[0].skill.vector).toBeUndefined(); // vector deleted
    });

    it('should throw NotFoundException if assignment not found', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue(null);

      await expect(
        service.getByAssignmentId({ assignmentId: 'a1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create skill on assignment', async () => {
      const dto: any = { assignmentId: 'a1' };
      (service as any).assignmentRepository.getById.mockResolvedValue({
        id: 'a1',
        subjectId: 's1',
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.skillOnAssignmentRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'sa1' });

      const result = await service.create(dto, { id: 'u1' } as any);

      expect(service.skillOnAssignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ subjectId: 's1' }),
      );
      expect(result.id).toBe('sa1');
    });

    it('should throw NotFoundException if assignment not found', async () => {
      (service as any).assignmentRepository.getById.mockResolvedValue(null);

      await expect(
        service.create({ assignmentId: 'a1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete skill on assignment', async () => {
      (
        service.skillOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue({ id: 'sa1', subjectId: 's1' });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (
        service.skillOnAssignmentRepository.delete as jest.Mock
      ).mockResolvedValue({ message: 'Deleted' });

      const result = await service.delete({ skillOnAssignmentId: 'sa1' }, {
        id: 'u1',
      } as any);

      expect(service.skillOnAssignmentRepository.delete).toHaveBeenCalledWith({
        id: 'sa1',
      });
      expect(result.message).toBe('Deleted');
    });

    it('should throw NotFoundException if item not found', async () => {
      (
        service.skillOnAssignmentRepository.getById as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.delete({ skillOnAssignmentId: 'sa1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
