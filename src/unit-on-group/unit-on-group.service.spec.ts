import { Test, TestingModule } from '@nestjs/testing';
import { UnitOnGroupService } from './unit-on-group.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { GroupOnSubjectService } from '../group-on-subject/group-on-subject.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('UnitOnGroupService', () => {
  let service: UnitOnGroupService;

  const mockPrismaService = {
    subject: { findUnique: jest.fn() },
  };

  const mockTeacherOnSubjectService = {
    ValidateAccess: jest.fn(),
  };

  const mockGroupOnSubjectService = {
    groupOnSubjectRepository: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnitOnGroupService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: TeacherOnSubjectService,
          useValue: mockTeacherOnSubjectService,
        },
        { provide: GroupOnSubjectService, useValue: mockGroupOnSubjectService },
      ],
    }).compile();

    service = module.get<UnitOnGroupService>(UnitOnGroupService);

    service.unitOnGroupRepository = {
      findUnique: jest.fn(),
      create: jest.fn(),
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
    it('should throw NotFoundException if group not found', async () => {
      mockGroupOnSubjectService.groupOnSubjectRepository.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.create({ groupOnSubjectId: 'g1' } as any, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if subject is locked', async () => {
      mockGroupOnSubjectService.groupOnSubjectRepository.findUnique.mockResolvedValue(
        { subjectId: 's1' },
      );
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: true,
      });

      await expect(service.create({} as any, {} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create unit on group', async () => {
      mockGroupOnSubjectService.groupOnSubjectRepository.findUnique.mockResolvedValue(
        { subjectId: 's1', schoolId: 'sch1' },
      );
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.unitOnGroupRepository.create as jest.Mock).mockResolvedValue({
        id: 'u1',
      });

      const result = await service.create(
        { title: 'Unit' } as any,
        { id: 'u1' } as any,
      );

      expect(service.unitOnGroupRepository.create).toHaveBeenCalled();
      expect(result.id).toBe('u1');
    });
  });

  describe('update', () => {
    it('should update unit and increment score', async () => {
      (service.unitOnGroupRepository.findUnique as jest.Mock).mockResolvedValue(
        { id: 'u1', subjectId: 's1', totalScore: 10 },
      );
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.unitOnGroupRepository.update as jest.Mock).mockResolvedValue({
        id: 'u1',
        totalScore: 15,
      });

      const result = await service.update(
        { query: { unitOnGroupId: 'u1' }, body: { score: 5 } } as any,
        { id: 'u1' } as any,
      );

      expect(service.unitOnGroupRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalScore: 15 }),
        }),
      );
      expect(result.totalScore).toBe(15);
    });
  });

  describe('reorder', () => {
    it('should reorder units', async () => {
      (service.unitOnGroupRepository.findUnique as jest.Mock).mockResolvedValue(
        { id: 'u1', subjectId: 's1' },
      );
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.unitOnGroupRepository.update as jest.Mock).mockResolvedValue({
        id: 'u1',
      });

      const result = await service.reorder(
        { unitOnGroupIds: ['u1'] } as any,
        { id: 'usr1' } as any,
      );

      expect(service.unitOnGroupRepository.update).toHaveBeenCalled();
      expect(result[0].id).toBe('u1');
    });
  });

  describe('delete', () => {
    it('should delete unit', async () => {
      (service.unitOnGroupRepository.findUnique as jest.Mock).mockResolvedValue(
        { id: 'u1', subjectId: 's1' },
      );
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isLocked: false,
      });
      mockTeacherOnSubjectService.ValidateAccess.mockResolvedValue(true);
      (service.unitOnGroupRepository.delete as jest.Mock).mockResolvedValue({
        id: 'u1',
      });

      const result = await service.delete(
        { unitOnGroupId: 'u1' } as any,
        { id: 'usr1' } as any,
      );

      expect(service.unitOnGroupRepository.delete).toHaveBeenCalledWith({
        unitOnGroupId: 'u1',
      });
      expect(result.id).toBe('u1');
    });
  });
});
