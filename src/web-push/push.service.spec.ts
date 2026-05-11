import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import * as webPush from 'web-push';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('PushService', () => {
  let service: PushService;

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PushService>(PushService);

    service.pushRepository = {
      findFirst: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(webPush.setVapidDetails).toHaveBeenCalled();
  });

  describe('sendNotification', () => {
    it('should send notification', async () => {
      const subscription = JSON.stringify({ endpoint: 'url' });
      const payload = {
        title: 'T',
        body: 'B',
        url: new URL('http://localhost'),
        groupId: 'g1',
      };

      await service.sendNotification(subscription, payload);

      expect(webPush.sendNotification).toHaveBeenCalledWith(
        JSON.parse(subscription),
        expect.any(String),
      );
    });

    it('should handle 410 error and delete subscription', async () => {
      const subscription = JSON.stringify({ endpoint: 'url' });
      const payload = {
        title: 'T',
        body: 'B',
        url: new URL('http://localhost'),
        groupId: 'g1',
      };

      (webPush.sendNotification as jest.Mock).mockRejectedValueOnce({
        statusCode: 410,
      });
      (service.pushRepository.findFirst as jest.Mock).mockResolvedValue({
        id: 's1',
      });

      await service.sendNotification(subscription, payload);

      expect(service.pushRepository.findFirst).toHaveBeenCalledWith({
        where: { endpoint: 'url' },
      });
      expect(service.pushRepository.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
    });
  });

  describe('subscribe', () => {
    it('should create subscription', async () => {
      const dto: any = { payload: { endpoint: 'url' }, userAgent: 'Chrome' };
      const user: any = { id: 'u1' };

      (service.pushRepository.findFirst as jest.Mock).mockResolvedValue(null);
      (service.pushRepository.create as jest.Mock).mockResolvedValue({
        data: JSON.stringify(dto.payload),
      });
      jest.spyOn(service, 'sendNotification').mockResolvedValue(undefined);

      const result = await service.subscribe(dto, user);

      expect(service.pushRepository.create).toHaveBeenCalled();
      expect(service.sendNotification).toHaveBeenCalled();
      expect(result.data).toBe(JSON.stringify(dto.payload));
    });

    it('should update existing subscription', async () => {
      const dto: any = { payload: { endpoint: 'url' }, userAgent: 'Chrome' };
      const user: any = { id: 'u1' };

      (service.pushRepository.findFirst as jest.Mock).mockResolvedValue({
        id: 's1',
      });
      (service.pushRepository.update as jest.Mock).mockResolvedValue({
        data: JSON.stringify(dto.payload),
      });
      jest.spyOn(service, 'sendNotification').mockResolvedValue(undefined);

      const result = await service.subscribe(dto, user);

      expect(service.pushRepository.update).toHaveBeenCalled();
      expect(result.data).toBe(JSON.stringify(dto.payload));
    });

    it('should throw BadRequestException if endpoint is missing', async () => {
      const dto: any = { payload: {} };

      await expect(service.subscribe(dto, {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
