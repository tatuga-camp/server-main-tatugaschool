import { Test, TestingModule } from '@nestjs/testing';
import { FileOnTeachingMaterialService } from './file-on-teaching-material.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TeachingMaterialService } from '../teaching-material/teaching-material.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('FileOnTeachingMaterialService', () => {
  let service: FileOnTeachingMaterialService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const mockStorageService = {};

  const mockTeachingMaterialService = {
    teachingMaterialRepository: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileOnTeachingMaterialService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        {
          provide: TeachingMaterialService,
          useValue: mockTeachingMaterialService,
        },
      ],
    }).compile();

    service = module.get<FileOnTeachingMaterialService>(
      FileOnTeachingMaterialService,
    );

    // Mock internal repository
    service.fileOnTeachingMaterialRepository = {
      create: jest.fn(),
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
    it('should create file successfully if admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      });
      const dto = {
        teachingMaterialId: 'tm1',
        url: 'pic.jpg',
        size: 100,
        type: 'image/jpeg',
      };
      const user = { id: 'u1', role: 'ADMIN' } as any;

      mockTeachingMaterialService.teachingMaterialRepository.findUnique.mockResolvedValue(
        { id: 'tm1' },
      );
      (
        service.fileOnTeachingMaterialRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'f1' });

      const result = await service.create(dto, user);

      expect(
        service.fileOnTeachingMaterialRepository.create,
      ).toHaveBeenCalledWith({ data: dto });
      expect(result.id).toBe('f1');
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      const user = { id: 'u1', role: 'USER' } as any;
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'USER',
      });

      await expect(service.create({} as any, user)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const user = { id: 'u1', role: 'ADMIN' } as any;

      await expect(service.create({} as any, user)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if teaching material not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      });
      const dto = {
        teachingMaterialId: 'tm1',
        url: 'pic.jpg',
        size: 100,
        type: 'image/jpeg',
      };
      const user = { id: 'u1', role: 'ADMIN' } as any;

      mockTeachingMaterialService.teachingMaterialRepository.findUnique.mockResolvedValue(
        null,
      );

      await expect(service.create(dto, user)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete file successfully if admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      });
      const user = { id: 'u1', role: 'ADMIN' } as any;
      (
        service.fileOnTeachingMaterialRepository.delete as jest.Mock
      ).mockResolvedValue({ id: 'f1' });

      const result = await service.delete(
        { fileOnTeachingMaterialId: 'f1' },
        user,
      );

      expect(
        service.fileOnTeachingMaterialRepository.delete,
      ).toHaveBeenCalledWith({ id: 'f1' });
      expect(result.id).toBe('f1');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const user = { id: 'u1', role: 'ADMIN' } as any;

      await expect(
        service.delete({ fileOnTeachingMaterialId: 'f1' }, user),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'USER',
      });
      const user = { id: 'u1', role: 'USER' } as any;

      await expect(
        service.delete({ fileOnTeachingMaterialId: 'f1' }, user),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
