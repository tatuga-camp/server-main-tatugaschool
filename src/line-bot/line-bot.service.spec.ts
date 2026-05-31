import { Test, TestingModule } from '@nestjs/testing';
import { LineBotService } from './line-bot.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// Mock line sdk
const mockPushMessage = jest.fn();
const mockReplyMessage = jest.fn();

jest.mock('@line/bot-sdk', () => ({
  messagingApi: {
    MessagingApiClient: jest.fn().mockImplementation(() => ({
      pushMessage: mockPushMessage,
      replyMessage: mockReplyMessage,
    })),
  },
}));

describe('LineBotService', () => {
  let service: LineBotService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-line-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineBotService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LineBotService>(LineBotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should throw BadRequestException if message is empty', async () => {
      await expect(
        service.sendMessage({ groupId: 'g1', message: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should push message', async () => {
      await service.sendMessage({ groupId: 'g1', message: 'Hello' });

      expect(mockPushMessage).toHaveBeenCalledWith({
        to: 'g1',
        messages: [{ type: 'text', text: 'Hello' }],
      });
    });
  });

  describe('replyMessage', () => {
    it('should throw BadRequestException if message is empty', async () => {
      await expect(
        service.replyMessage({ replyToken: 'rt1', message: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reply message', async () => {
      await service.replyMessage({ replyToken: 'rt1', message: 'Hello' });

      expect(mockReplyMessage).toHaveBeenCalledWith({
        replyToken: 'rt1',
        messages: [{ type: 'text', text: 'Hello' }],
      });
    });
  });

  describe('replyOrPushMessage', () => {
    it('replies and does not push when reply succeeds', async () => {
      mockReplyMessage.mockResolvedValue(undefined);

      await service.replyOrPushMessage({
        replyToken: 'rt1',
        groupId: 'g1',
        message: 'Hi',
      });

      expect(mockReplyMessage).toHaveBeenCalledWith({
        replyToken: 'rt1',
        messages: [{ type: 'text', text: 'Hi' }],
      });
      expect(mockPushMessage).not.toHaveBeenCalled();
    });

    it('falls back to push when reply throws', async () => {
      mockReplyMessage.mockRejectedValue(new Error('ECONNRESET'));

      await service.replyOrPushMessage({
        replyToken: 'rt1',
        groupId: 'g1',
        message: 'Hi',
      });

      expect(mockReplyMessage).toHaveBeenCalled();
      expect(mockPushMessage).toHaveBeenCalledWith({
        to: 'g1',
        messages: [{ type: 'text', text: 'Hi' }],
      });
    });
  });
});
