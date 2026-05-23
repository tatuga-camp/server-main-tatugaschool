import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

// Mock mailersend to prevent actually calling APIs
jest.mock('mailersend', () => ({
  MailerSend: jest.fn().mockImplementation(() => ({
    email: {
      send: jest.fn().mockResolvedValue(true),
      sendBulk: jest.fn().mockResolvedValue(true),
    },
  })),
  Recipient: jest.fn().mockImplementation((email) => ({ email })),
  Sender: jest.fn().mockImplementation((email, name) => ({ email, name })),
  EmailParams: jest.fn().mockImplementation(() => ({
    setFrom: jest.fn().mockReturnThis(),
    setTo: jest.fn().mockReturnThis(),
    setSubject: jest.fn().mockReturnThis(),
    setHtml: jest.fn().mockReturnThis(),
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  const mockConfigService = {
    get: jest.fn((key: string): any => {
      if (key === 'EMAIL_API_KEY') return 'mock-key';
      if (key === 'NODE_ENV') return 'production';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMail', () => {
    it('should send email successfully in production', async () => {
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'EMAIL_API_KEY') return 'mock-key';
        if (key === 'NODE_ENV') return 'production';
        return null;
      });

      const dto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      await service.sendMail(dto);

      expect((service as any).mailerSend.email.send).toHaveBeenCalled();
    });

    it('should not send email in non-production environments', async () => {
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'EMAIL_API_KEY') return 'mock-key';
        if (key === 'NODE_ENV') return 'test';
        return null;
      });

      const dto = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      };

      // Since mailerSend object might be mocked, we can re-instantiate or just clear mock
      ((service as any).mailerSend.email.send as jest.Mock).mockClear();

      await service.sendMail(dto);

      expect((service as any).mailerSend.email.send).not.toHaveBeenCalled();
    });
  });

  describe('sendBulk', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'EMAIL_API_KEY') return 'mock-key';
        if (key === 'NODE_ENV') return 'production';
        return null;
      });
      // Skip the 60s inter-chunk throttle in tests by default
      (service as any).chunkDelayMs = 0;
    });

    it('does nothing when NODE_ENV is not production or development', async () => {
      mockConfigService.get.mockImplementation((key) => {
        if (key === 'NODE_ENV') return 'test';
        return null;
      });

      const result = await service.sendBulk({
        to: ['a@x.com', 'b@x.com'],
        subject: 's',
        html: '<p>h</p>',
      });

      expect(
        (service as any).mailerSend.email.sendBulk,
      ).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it('returns 0/0 when recipient list is empty', async () => {
      const result = await service.sendBulk({
        to: [],
        subject: 's',
        html: '<p>h</p>',
      });
      expect(
        (service as any).mailerSend.email.sendBulk,
      ).not.toHaveBeenCalled();
      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it('chunks recipients into batches of 500', async () => {
      const to = Array.from({ length: 1200 }, (_, i) => `u${i}@x.com`);
      await service.sendBulk({ to, subject: 's', html: '<p>h</p>' });
      const calls = (service as any).mailerSend.email.sendBulk.mock.calls;
      expect(calls).toHaveLength(3);
      expect(calls[0][0]).toHaveLength(500);
      expect(calls[1][0]).toHaveLength(500);
      expect(calls[2][0]).toHaveLength(200);
    });

    it('aggregates sent/failed counts across chunks', async () => {
      const sendBulkMock = (service as any).mailerSend.email.sendBulk as jest.Mock;
      sendBulkMock
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(true);

      const to = Array.from({ length: 1100 }, (_, i) => `u${i}@x.com`);
      const result = await service.sendBulk({ to, subject: 's', html: '<p>h</p>' });

      expect(result).toEqual({ sent: 500 + 100, failed: 500 });
    });

    it('waits chunkDelayMs between chunks to respect MailerSend rate limit', async () => {
      jest.useFakeTimers();
      (service as any).chunkDelayMs = 60_000;

      const sendBulkMock = (service as any).mailerSend.email.sendBulk as jest.Mock;
      const to = Array.from({ length: 1500 }, (_, i) => `u${i}@x.com`);
      const promise = service.sendBulk({ to, subject: 's', html: '<p>h</p>' });

      // Let the first chunk dispatch resolve
      await Promise.resolve();
      await Promise.resolve();
      expect(sendBulkMock).toHaveBeenCalledTimes(1);

      // Advance through the first throttle window → second chunk fires
      await jest.advanceTimersByTimeAsync(60_000);
      expect(sendBulkMock).toHaveBeenCalledTimes(2);

      // Advance through the second throttle window → third (last) chunk fires
      await jest.advanceTimersByTimeAsync(60_000);
      expect(sendBulkMock).toHaveBeenCalledTimes(3);

      const result = await promise;
      expect(result).toEqual({ sent: 1500, failed: 0 });

      jest.useRealTimers();
    });

    it('does not wait after the final chunk', async () => {
      jest.useFakeTimers();
      (service as any).chunkDelayMs = 60_000;

      const sendBulkMock = (service as any).mailerSend.email.sendBulk as jest.Mock;
      const to = Array.from({ length: 500 }, (_, i) => `u${i}@x.com`);
      const promise = service.sendBulk({ to, subject: 's', html: '<p>h</p>' });

      // Single chunk → method should resolve without needing the timer to advance
      await jest.advanceTimersByTimeAsync(0);
      const result = await promise;
      expect(result).toEqual({ sent: 500, failed: 0 });
      expect(sendBulkMock).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});
