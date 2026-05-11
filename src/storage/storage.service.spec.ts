import { Test, TestingModule } from '@nestjs/testing';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  BadGatewayException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// Mock AWS S3 and Presigner
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ Body: 'mock-body' }),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.com'),
}));

describe('StorageService', () => {
  let service: StorageService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'NODE_ENV') return 'development'; // To trigger initialization
      if (key === 'CLOUDFLARE_API_ENDPOINT')
        return 'https://api.cloudflare.com';
      if (key === 'CLOUDFLARE_R2_ACCESS_KEY_ID') return 'key_id';
      if (key === 'CLOUDFLARE_R2_SECRET_ACCESS_KEY') return 'secret';
      if (key === 'CLOUDFLARE_R2_MEDIA_BUCKET') return 'mock-bucket';
      if (key === 'CLOUDFLARE_R2_PUBLIC_DOMAIN') return 'mock-domain.com';
      return null;
    }),
  };

  const mockPrismaService = {
    memberOnSchool: { findFirst: jest.fn() },
    school: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateAccess', () => {
    it('should validate successfully', async () => {
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        status: 'ACCEPT',
      });

      const result = await service.validateAccess({
        user: { id: 'u1' } as any,
        schoolId: 'sch1',
      });
      expect(result.status).toBe('ACCEPT');
    });

    it('should throw ForbiddenException if user not member', async () => {
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue(null);

      await expect(
        service.validateAccess({ user: { id: 'u1' } as any, schoolId: 'sch1' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUploadSignedUrl', () => {
    it('should generate a signed URL for user upload to school', async () => {
      mockPrismaService.school.findUnique.mockResolvedValue({
        id: 'sch1',
        totalStorage: 100,
        limitTotalStorage: 1000,
      });
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        status: 'ACCEPT',
      });

      const dto = {
        fileName: 'test.jpg',
        fileSize: 100,
        fileType: 'image/jpeg',
        userId: 'u1',
        schoolId: 'sch1',
      };
      const result = await service.getUploadSignedUrl(dto, { id: 'u1' } as any);

      expect(getSignedUrl).toHaveBeenCalled();
      expect(result.signURL).toBe('https://mock-signed-url.com');
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should throw BadRequestException if file is too large', async () => {
      const dto = {
        fileName: 'test.jpg',
        fileSize: 3 * 1024 * 1024 * 1024,
        fileType: 'image/jpeg',
      };
      await expect(service.getUploadSignedUrl(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if storage limits exceeded', async () => {
      mockPrismaService.school.findUnique.mockResolvedValue({
        id: 'sch1',
        totalStorage: 950,
        limitTotalStorage: 1000,
      });
      mockPrismaService.memberOnSchool.findFirst.mockResolvedValue({
        status: 'ACCEPT',
      });

      const dto = {
        fileName: 'test.jpg',
        fileSize: 100,
        fileType: 'image/jpeg',
        schoolId: 'sch1',
      };
      await expect(
        service.getUploadSignedUrl(dto, { id: 'u1' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getReadSignedUrl', () => {
    it('should generate read signed url', async () => {
      const result = await service.getReadSignedUrl('path/to/file.pdf');

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'mock-bucket',
        Key: 'path/to/file.pdf',
      });
      expect(getSignedUrl).toHaveBeenCalled();
      expect(result).toBe('https://mock-signed-url.com');
    });
  });

  describe('uploadFile', () => {
    it('should upload a file', async () => {
      const result = await service.uploadFile(
        'path/to/file.jpg',
        Buffer.from('test'),
        'image/jpeg',
      );

      expect(PutObjectCommand).toHaveBeenCalled();
      expect((service as any).s3Client.send).toHaveBeenCalled();
      expect(result).toBe('https://mock-domain.com/path/to/file.jpg');
    });
  });

  describe('getFileStream', () => {
    it('should retrieve a file stream', async () => {
      const result = await service.getFileStream('path/to/file.jpg');

      expect(GetObjectCommand).toHaveBeenCalled();
      expect((service as any).s3Client.send).toHaveBeenCalled();
      expect(result).toBe('mock-body');
    });

    it('should extract key from full URL', async () => {
      await service.getFileStream('https://mock-domain.com/path/to/file.jpg');

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'mock-bucket',
        Key: 'path/to/file.jpg',
      });
    });
  });

  describe('DeleteFileOnStorage', () => {
    it('should delete file if matching domain', async () => {
      const result = await service.DeleteFileOnStorage({
        fileName: 'https://mock-domain.com/path/to/file.jpg',
      });

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'mock-bucket',
        Key: 'path/to/file.jpg',
      });
      expect((service as any).s3Client.send).toHaveBeenCalled();
      expect(result.message).toContain('has been deleted');
    });

    it('should return warning if domain mismatch', async () => {
      const result = await service.DeleteFileOnStorage({
        fileName: 'https://other-domain.com/path/to/file.jpg',
      });

      expect(DeleteObjectCommand).not.toHaveBeenCalled();
      expect(result.message).toContain('not from R2 storage');
    });
  });
});
