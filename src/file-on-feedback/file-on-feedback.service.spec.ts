import { Test, TestingModule } from '@nestjs/testing';
import { FileOnFeedbackService } from './file-on-feedback.service';
import { FileOnFeedbackRepository } from './file-on-feedback.repository';
import { NotFoundException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('FileOnFeedbackService', () => {
  let service: FileOnFeedbackService;

  const mockFileOnFeedbackRepo = {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileOnFeedbackService,
        { provide: FileOnFeedbackRepository, useValue: mockFileOnFeedbackRepo },
      ],
    }).compile();

    service = module.get<FileOnFeedbackService>(FileOnFeedbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a file on feedback', async () => {
      const dto: any = { url: 'pic.jpg', type: 'image/jpeg', size: 100 };
      mockFileOnFeedbackRepo.create.mockResolvedValue({ id: 'f1', ...dto });

      const result = await service.create('fb1', dto);

      expect(mockFileOnFeedbackRepo.create).toHaveBeenCalledWith({
        data: {
          feedbackId: 'fb1',
          url: 'pic.jpg',
          type: 'image/jpeg',
          size: 100,
        },
      });
      expect(result.id).toBe('f1');
    });
  });

  describe('remove', () => {
    it('should remove a file successfully', async () => {
      mockFileOnFeedbackRepo.findUnique.mockResolvedValue({ id: 'f1' });
      mockFileOnFeedbackRepo.delete.mockResolvedValue({ id: 'f1' });

      const result = await service.remove('f1');

      expect(mockFileOnFeedbackRepo.delete).toHaveBeenCalledWith({
        where: { id: 'f1' },
      });
      expect(result.id).toBe('f1');
    });

    it('should throw NotFoundException if file is not found', async () => {
      mockFileOnFeedbackRepo.findUnique.mockResolvedValue(null);

      await expect(service.remove('f1')).rejects.toThrow(NotFoundException);
    });
  });
});
