import { Test, TestingModule } from '@nestjs/testing';
import { SkillService } from './skill.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { AuthService } from '../auth/auth.service';
import { NotFoundException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('SkillService', () => {
  let service: SkillService;

  const mockPrismaService = {};

  const mockAiService = {
    embbedingText: jest.fn(),
  };

  const mockStorageService = {};

  const mockAuthService = {
    getGoogleAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<SkillService>(SkillService);

    // Mock internal repositories
    service.skillRepository = {
      findById: jest.fn(),
      findByVectorSearch: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    service.assignmentRepository = {
      getById: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOne', () => {
    it('should return a skill', async () => {
      (service.skillRepository.findById as jest.Mock).mockResolvedValue({
        id: 'sk1',
      });

      const result = await service.getOne({ skillId: 'sk1' });

      expect(service.skillRepository.findById).toHaveBeenCalledWith({
        skillId: 'sk1',
      });
      expect(result.id).toBe('sk1');
    });
  });

  describe('findByVectorSearch', () => {
    it('should return skills based on assignment vector', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue({
        id: 'a1',
        vector: [0.1, 0.2],
      });
      (
        service.skillRepository.findByVectorSearch as jest.Mock
      ).mockResolvedValue([{ id: 'sk1' }]);

      const result = await service.findByVectorSearch({ assignmentId: 'a1' });

      expect(service.skillRepository.findByVectorSearch).toHaveBeenCalledWith([
        0.1, 0.2,
      ]);
      expect(result[0].id).toBe('sk1');
    });

    it('should throw NotFoundException if assignment not found', async () => {
      (service.assignmentRepository.getById as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.findByVectorSearch({ assignmentId: 'a1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create skill with embedded text', async () => {
      mockAuthService.getGoogleAccessToken.mockResolvedValue('token');
      mockAiService.embbedingText.mockResolvedValue({
        predictions: [{ embeddings: { values: [0.1, 0.2] } }],
      });
      (service.skillRepository.create as jest.Mock).mockResolvedValue({
        id: 'sk1',
      });

      const result = await service.create({
        title: 'Skill',
        description: 'Desc',
        keywords: 'Key',
      } as any);

      expect(mockAiService.embbedingText).toHaveBeenCalledWith(
        'Skill Desc Key',
        'token',
      );
      expect(service.skillRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ vector: [0.1, 0.2] }),
      );
      expect(result.id).toBe('sk1');
    });
  });

  describe('update', () => {
    it('should update skill and recalculate embedded text', async () => {
      mockAuthService.getGoogleAccessToken.mockResolvedValue('token');
      (service.skillRepository.findById as jest.Mock).mockResolvedValue({
        title: 'OldTitle',
        description: 'OldDesc',
        keywords: 'OldKey',
      });
      mockAiService.embbedingText.mockResolvedValue({
        predictions: [{ embeddings: { values: [0.5, 0.6] } }],
      });
      (service.skillRepository.update as jest.Mock).mockResolvedValue({
        id: 'sk1',
      });

      const result = await service.update({
        query: { skillId: 'sk1' },
        body: { title: 'NewTitle' },
      } as any);

      // description and keywords should fallback to old
      expect(mockAiService.embbedingText).toHaveBeenCalledWith(
        'NewTitle OldDesc OldKey',
        'token',
      );
      expect(service.skillRepository.update).toHaveBeenCalledWith({
        query: { skillId: 'sk1' },
        data: expect.objectContaining({
          title: 'NewTitle',
          vector: [0.5, 0.6],
        }),
      });
      expect(result.id).toBe('sk1');
    });

    it('should throw NotFoundException if skill not found', async () => {
      (service.skillRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update({ query: { skillId: 'sk1' }, body: {} } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete skill', async () => {
      (service.skillRepository.delete as jest.Mock).mockResolvedValue({
        message: 'Deleted',
      });

      const result = await service.delete({ skillId: 'sk1' });

      expect(service.skillRepository.delete).toHaveBeenCalledWith({
        skillId: 'sk1',
      });
      expect(result.message).toBe('Deleted');
    });
  });
});
