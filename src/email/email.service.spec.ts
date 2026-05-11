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
});
