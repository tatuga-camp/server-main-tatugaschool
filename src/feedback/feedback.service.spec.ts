import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from './feedback.service';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackRepository } from './feedback.repository';
import { ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('FeedbackService', () => {
  let service: FeedbackService;

  const mockPrismaService = {
    fileOnFeedback: {
      deleteMany: jest.fn(),
    },
  };

  const mockFeedbackRepository = {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FeedbackRepository, useValue: mockFeedbackRepository },
      ],
    }).compile();

    service = module.get<FeedbackService>(FeedbackService);

    (service as any).userRepository = {
      findById: jest.fn(),
    };
  });

  const adminUser = { id: 'u-admin', email: 'a@a.com' } as any;
  const nonAdminUser = { id: 'u-user', email: 'u@a.com' } as any;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create feedback successfully with files and user', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        private: true,
        content: 'Good job',
        files: [{ url: 'http://pic.jpg' }],
      };

      mockFeedbackRepository.create.mockResolvedValue({
        id: 'f1',
        content: 'Good job',
      });

      const result = await service.create(mockUser, dto);

      expect(mockFeedbackRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: 'Good job',
            userId: 'u1',
            fileOnFeedbacks: { create: [{ url: 'http://pic.jpg' }] },
          }),
        }),
      );
      expect(result.id).toBe('f1');
    });

    it('should create feedback anonymously', async () => {
      const mockUser = { id: 'u1' } as any;
      const dto: any = {
        private: false,
        content: 'Good job',
      };

      mockFeedbackRepository.create.mockResolvedValue({ id: 'f1' });

      const result = await service.create(mockUser, dto);

      expect(mockFeedbackRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ userId: 'u1' }),
        }),
      );
      expect(result.id).toBe('f1');
    });
  });

  describe('findAll', () => {
    it('should paginate and return items when user is ADMIN', async () => {
      (service as any).userRepository.findById.mockResolvedValue({
        id: 'u-admin',
        role: 'ADMIN',
      });
      mockFeedbackRepository.count.mockResolvedValue(15);
      mockFeedbackRepository.findMany.mockResolvedValue([{ id: 'f1' }]);

      const result = await service.findAll(
        { page: 2, limit: 10, tag: 'BUG' } as any,
        adminUser,
      );

      expect(mockFeedbackRepository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tag: 'BUG' },
          skip: 10,
          take: 10,
        }),
      );
      expect(result).toEqual({
        items: [{ id: 'f1' }],
        total: 15,
        page: 2,
        limit: 10,
        totalPages: 2,
      });
    });

    it('should throw ForbiddenException when user is not ADMIN', async () => {
      (service as any).userRepository.findById.mockResolvedValue({
        id: 'u-user',
        role: 'TEACHER',
      });

      await expect(
        service.findAll({ page: 1, limit: 10 } as any, nonAdminUser),
      ).rejects.toThrow(ForbiddenException);
      expect(mockFeedbackRepository.findMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove files and feedback when user is ADMIN', async () => {
      (service as any).userRepository.findById.mockResolvedValue({
        id: 'u-admin',
        role: 'ADMIN',
      });
      mockPrismaService.fileOnFeedback.deleteMany.mockResolvedValue({
        count: 1,
      });
      mockFeedbackRepository.delete.mockResolvedValue({ id: 'f1' });

      const result = await service.remove('f1', adminUser);

      expect(mockPrismaService.fileOnFeedback.deleteMany).toHaveBeenCalledWith({
        where: { feedbackId: 'f1' },
      });
      expect(mockFeedbackRepository.delete).toHaveBeenCalledWith({
        where: { id: 'f1' },
      });
      expect(result.id).toBe('f1');
    });

    it('should throw ForbiddenException when user is not ADMIN', async () => {
      (service as any).userRepository.findById.mockResolvedValue({
        id: 'u-user',
        role: 'TEACHER',
      });

      await expect(service.remove('f1', nonAdminUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockFeedbackRepository.delete).not.toHaveBeenCalled();
      expect(mockPrismaService.fileOnFeedback.deleteMany).not.toHaveBeenCalled();
    });
  });
});
