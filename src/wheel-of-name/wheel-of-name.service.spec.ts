import { Test, TestingModule } from '@nestjs/testing';
import { WheelOfNameService } from './wheel-of-name.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('WheelOfNameService', () => {
  let service: WheelOfNameService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WheelOfNameService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WheelOfNameService>(WheelOfNameService);

    // Mock internal repository
    (service as any).wheelOfNameRepository = {
      get: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should get wheel of name', async () => {
      (
        (service as any).wheelOfNameRepository.get as jest.Mock
      ).mockResolvedValue({ data: { path: 'path' } });

      const result = await service.get({ path: 'path' });

      expect((service as any).wheelOfNameRepository.get).toHaveBeenCalledWith({
        where: { path: 'path' },
      });
      expect(result.data.path).toBe('path');
    });
  });

  describe('create', () => {
    it('should create wheel of name', async () => {
      (
        (service as any).wheelOfNameRepository.create as jest.Mock
      ).mockResolvedValue({ data: { path: 'path' } });

      const result = await service.create({
        texts: [{ text: 'A' }],
        title: 'T',
        description: 'D',
      });

      expect((service as any).wheelOfNameRepository.create).toHaveBeenCalled();
      expect(result.data.path).toBe('path');
    });
  });

  describe('update', () => {
    it('should update wheel of name', async () => {
      (
        (service as any).wheelOfNameRepository.update as jest.Mock
      ).mockResolvedValue({ success: true });

      const result = await service.update({
        path: 'path',
        texts: [{ text: 'A' }],
        title: 'T',
        description: 'D',
      });

      expect((service as any).wheelOfNameRepository.update).toHaveBeenCalled();
      expect((result as any).success).toBe(true);
    });
  });
});
