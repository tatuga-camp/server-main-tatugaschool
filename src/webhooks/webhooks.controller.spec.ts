import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { ConfigService } from '@nestjs/config';

// Mock heavy native/ESM modules that are pulled in transitively.
jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// Mock the LINE SDK so signature validation always passes in tests.
jest.mock('@line/bot-sdk', () => ({
  validateSignature: jest.fn().mockReturnValue(true),
}));

describe('WebhooksController', () => {
  let controller: WebhooksController;

  const mockWebhooksService = {
    handleLineWebhook: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('channel-secret'),
  };

  const makeReq = () =>
    ({
      headers: { 'x-line-signature': 'sig' },
      rawBody: Buffer.from(JSON.stringify({ events: [] })),
    }) as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleLineWebhook', () => {
    it('returns OK and dispatches the handler with the parsed body', async () => {
      mockWebhooksService.handleLineWebhook.mockResolvedValue(undefined);

      const result = await controller.handleLineWebhook(makeReq());

      expect(result).toBe('OK');
      expect(mockWebhooksService.handleLineWebhook).toHaveBeenCalledWith({
        events: [],
      });
    });

    it('still returns OK when the background handler rejects', async () => {
      mockWebhooksService.handleLineWebhook.mockRejectedValue(
        new Error('boom'),
      );

      await expect(controller.handleLineWebhook(makeReq())).resolves.toBe('OK');
      expect(mockWebhooksService.handleLineWebhook).toHaveBeenCalledTimes(1);
    });
  });
});
