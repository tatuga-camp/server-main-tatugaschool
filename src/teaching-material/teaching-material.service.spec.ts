import { Test, TestingModule } from '@nestjs/testing';
import { TeachingMaterialService } from './teaching-material.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AiService } from '../ai/ai.service';
import { AuthService } from '../auth/auth.service';
import { FileOnTeachingMaterialService } from '../file-on-teaching-material/file-on-teaching-material.service';
import { ImageService } from '../image/image.service';
import { HttpService } from '@nestjs/axios';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { of } from 'rxjs';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('TeachingMaterialService', () => {
  let service: TeachingMaterialService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
  };

  const mockAiService = {
    translateText: jest.fn(),
    embbedingText: jest.fn(),
    suggestTeachingMaterialMetadata: jest.fn(),
  };

  const mockAuthService = {
    getGoogleAccessToken: jest.fn(),
  };

  const mockFileOnTeachingMaterialService = {
    fileOnTeachingMaterialRepository: {
      findMany: jest.fn(),
    },
  };

  const mockImageService = {
    generatePdfThumbnail: jest.fn(),
    encodeImageToBlurhash: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachingMaterialService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: AiService, useValue: mockAiService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: FileOnTeachingMaterialService,
          useValue: mockFileOnTeachingMaterialService,
        },
        { provide: ImageService, useValue: mockImageService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<TeachingMaterialService>(TeachingMaterialService);

    service.teachingMaterialRepository = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findByVector: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should throw NotFoundException if teaching material not found', async () => {
      (
        service.teachingMaterialRepository.findUnique as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        service.get({ teachingMaterialId: 'tm1' }, {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return teaching material with files and creator', async () => {
      const mockTM = { id: 'tm1', creatorURL: 'http://example.com' };
      (
        service.teachingMaterialRepository.findUnique as jest.Mock
      ).mockResolvedValue(mockTM);
      mockFileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany.mockResolvedValue(
        [{ id: 'f1' }],
      );

      const mockHtml = `
        <html><head>
          <meta property="og:title" content="Test Title">
          <meta property="og:description" content="Test Desc">
          <meta property="og:image" content="http://image.jpg">
        </head></html>
      `;
      mockHttpService.get.mockReturnValue(of({ data: mockHtml }));

      const result = await service.get(
        { teachingMaterialId: 'tm1' },
        {} as any,
      );

      expect(result.id).toBe('tm1');
      expect(result.files[0].id).toBe('f1');
      expect(result.createor.title).toBe('Test Title');
      expect(result.createor.description).toBe('Test Desc');
      expect(result.createor.image).toBe('http://image.jpg');
    });

    it('should return fallback creator on html error', async () => {
      const mockTM = { id: 'tm1', creatorURL: 'http://example.com' };
      (
        service.teachingMaterialRepository.findUnique as jest.Mock
      ).mockResolvedValue(mockTM);
      mockFileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany.mockResolvedValue(
        [],
      );

      jest
        .spyOn(service, 'getExternalUrlHtml')
        .mockRejectedValue(new Error('error'));

      const result = await service.get(
        { teachingMaterialId: 'tm1' },
        {} as any,
      );

      expect(result.createor.title).toBe('ERROR');
    });
  });

  describe('CursorBasedPagination', () => {
    it('should return paginated materials with files', async () => {
      (
        service.teachingMaterialRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'tm1' }]);
      mockFileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany.mockResolvedValue(
        [{ id: 'f1', teachingMaterialId: 'tm1' }],
      );

      const result = await service.CursorBasedPagination({
        cursor: 'tm0',
        take: 10,
      });

      expect(result[0].id).toBe('tm1');
      expect(result[0].files[0].id).toBe('f1');
    });
  });

  describe('count', () => {
    it('should return count', async () => {
      (service.teachingMaterialRepository.count as jest.Mock).mockResolvedValue(
        5,
      );
      const result = await service.count();
      expect(result).toBe(5);
    });
  });

  describe('findByAI', () => {
    it('should return materials without AI if no search term', async () => {
      (
        service.teachingMaterialRepository.findMany as jest.Mock
      ).mockResolvedValue([{ id: 'tm1' }]);

      const result = await service.findByAI({});

      expect(service.teachingMaterialRepository.findMany).toHaveBeenCalled();
      expect(result[0].id).toBe('tm1');
    });

    it('should use AI to search and sort by recent', async () => {
      mockAuthService.getGoogleAccessToken.mockResolvedValue('token');
      mockAiService.translateText.mockResolvedValue('translated');
      mockAiService.embbedingText.mockResolvedValue({
        predictions: [{ embeddings: { values: [0.1] } }],
      });

      const mockMaterials = [
        { id: 'tm1', createAt: new Date('2023-01-01') },
        { id: 'tm2', createAt: new Date('2023-01-02') },
      ];
      (
        service.teachingMaterialRepository.findByVector as jest.Mock
      ).mockResolvedValue(mockMaterials);

      const result = await service.findByAI({
        search: 'term',
        filter: 'recent',
      });

      expect(result[0].id).toBe('tm2'); // tm2 is more recent
    });
  });

  describe('suggestionVectorResouce', () => {
    it('should return suggestion', async () => {
      mockAuthService.getGoogleAccessToken.mockResolvedValue('token');
      mockAiService.suggestTeachingMaterialMetadata.mockResolvedValue({
        title: 'A',
      });

      const result = await service.suggestionVectorResouce({ data: [] });
      expect(result.title).toBe('A');
    });
  });

  describe('create', () => {
    it('should create material if admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      });
      mockAuthService.getGoogleAccessToken.mockResolvedValue('token');
      mockAiService.embbedingText.mockResolvedValue({
        predictions: [{ embeddings: { values: [0.1] } }],
      });
      (
        service.teachingMaterialRepository.create as jest.Mock
      ).mockResolvedValue({ id: 'tm1' });

      const result = await service.create(
        {
          title: 'A',
          description: 'B',
          tags: ['C'],
          accessLevel: 'FREE',
          creatorURL: '',
        },
        { role: 'ADMIN' } as any,
      );

      expect(result.id).toBe('tm1');
    });

    it('should throw ForbiddenException if not admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'USER',
      });
      await expect(
        service.create({} as any, { role: 'USER' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createThumnail', () => {
    it('should create thumbnail from pdf', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      });
      (
        service.teachingMaterialRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'tm1' });
      mockFileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany.mockResolvedValue(
        [{ type: 'application/pdf', url: 'test.pdf' }],
      );
      mockImageService.generatePdfThumbnail.mockResolvedValue(Buffer.from(''));
      mockStorageService.uploadFile.mockResolvedValue('thumb.png');
      mockImageService.encodeImageToBlurhash.mockResolvedValue('blur');
      (
        service.teachingMaterialRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'tm1', thumbnail: 'thumb.png' });

      const result = await service.createThumnail(
        { teachingMaterialId: 'tm1' },
        { role: 'ADMIN', id: 'u1' } as any,
      );

      expect(result.thumbnail).toBe('thumb.png');
    });

    it('should create thumbnail from image if no pdf', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      });
      (
        service.teachingMaterialRepository.findUnique as jest.Mock
      ).mockResolvedValue({ id: 'tm1' });
      mockFileOnTeachingMaterialService.fileOnTeachingMaterialRepository.findMany.mockResolvedValue(
        [{ type: 'image/png', url: 'test.png' }],
      );
      mockImageService.encodeImageToBlurhash.mockResolvedValue('blur');
      (
        service.teachingMaterialRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'tm1', thumbnail: 'test.png' });

      const result = await service.createThumnail(
        { teachingMaterialId: 'tm1' },
        { role: 'ADMIN', id: 'u1' } as any,
      );

      expect(result.thumbnail).toBe('test.png');
    });

    it('should throw ForbiddenException if not admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'USER',
      });
      await expect(
        service.createThumnail({ teachingMaterialId: 'tm1' }, {
          role: 'USER',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should update material if admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: 'ADMIN',
      });
      mockAuthService.getGoogleAccessToken.mockResolvedValue('token');
      mockAiService.embbedingText.mockResolvedValue({
        predictions: [{ embeddings: { values: [0.1] } }],
      });
      (
        service.teachingMaterialRepository.update as jest.Mock
      ).mockResolvedValue({ id: 'tm1' });

      const result = await service.update(
        { query: { id: 'tm1' }, body: { title: 'A', tags: [] } },
        { role: 'ADMIN' } as any,
      );

      expect(result.id).toBe('tm1');
    });
  });

  describe('getExternalUrlHtml', () => {
    it('should return HTML', async () => {
      mockHttpService.get.mockReturnValue(of({ data: 'html' }));

      const result = await service.getExternalUrlHtml('http://example.com');
      expect(result).toBe('html');
    });

    it('should throw BadRequestException if url missing', async () => {
      await expect(service.getExternalUrlHtml('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
