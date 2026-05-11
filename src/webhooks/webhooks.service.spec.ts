import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import { StripeService } from '../stripe/stripe.service';
import { SchoolService } from '../school/school.service';
import { LineBotService } from '../line-bot/line-bot.service';
import { SubjectService } from '../subject/subject.service';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('WebhooksService', () => {
  let service: WebhooksService;

  const mockStripeService = {
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn(), list: jest.fn(), cancel: jest.fn() },
    prices: { retrieve: jest.fn() },
    products: { retrieve: jest.fn() },
    invoices: { list: jest.fn(), voidInvoice: jest.fn() },
  };

  const mockSchoolService = {
    schoolRepository: { findUnique: jest.fn(), findFirst: jest.fn() },
    upgradePlanBasic: jest.fn(),
    upgradePlanPremium: jest.fn(),
    upgradePlanEnterprise: jest.fn(),
    upgradePlanFree: jest.fn(),
  };

  const mockLineBotService = {
    replyMessage: jest.fn(),
  };

  const mockSubjectService = {
    leaveGroupLine: jest.fn(),
    subjectRepository: { findFirst: jest.fn() },
    getAllSubjectData: jest.fn(),
  };

  const mockPrismaService = {
    subject: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockAiService = {
    generateLineBotSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: StripeService, useValue: mockStripeService },
        { provide: SchoolService, useValue: mockSchoolService },
        { provide: LineBotService, useValue: mockLineBotService },
        { provide: SubjectService, useValue: mockSubjectService },
        { provide: EmailService, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleLineWebhook', () => {
    it('should handle join event', async () => {
      const dto: any = {
        events: [
          { type: 'join', source: { type: 'group' }, replyToken: 'rt1' },
        ],
      };
      await service.handleLineWebhook(dto);
      expect(mockLineBotService.replyMessage).toHaveBeenCalled();
    });

    it('should handle leave event', async () => {
      const dto: any = {
        events: [{ type: 'leave', source: { type: 'group', groupId: 'g1' } }],
      };
      await service.handleLineWebhook(dto);
      expect(mockSubjectService.leaveGroupLine).toHaveBeenCalledWith({
        groupId: 'g1',
      });
    });

    it('should handle code verification and reply', async () => {
      const mockEvent = {
        type: 'message',
        source: { type: 'group', groupId: 'g1' },
        replyToken: 'rt1',
        message: {
          type: 'text',
          text: '@Tatuga 123456',
          mention: { mentionees: [{ isSelf: true }] },
        },
      };
      const dto: any = { events: [mockEvent] };

      mockSubjectService.subjectRepository.findFirst.mockResolvedValue(null);
      mockPrismaService.subject.findUnique.mockResolvedValue({
        id: 's1',
        isVerifyLine: false,
      });

      await service.handleLineWebhook(dto);

      expect(mockPrismaService.subject.update).toHaveBeenCalled();
      expect(mockLineBotService.replyMessage).toHaveBeenCalled();
    });

    it('should answer AI for verified group if Premium', async () => {
      const mockEvent = {
        type: 'message',
        source: { type: 'group', groupId: 'g1' },
        replyToken: 'rt1',
        message: {
          type: 'text',
          text: '@Tatuga tell me',
          mention: { mentionees: [{ isSelf: true }] },
        },
      };
      const dto: any = { events: [mockEvent] };

      mockSubjectService.subjectRepository.findFirst.mockResolvedValue({
        id: 's1',
        isVerifyLine: true,
        lineGroupId: 'g1',
        schoolId: 'sch1',
      });
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        plan: 'PREMIUM',
      });
      mockSubjectService.getAllSubjectData.mockResolvedValue({});
      mockAiService.generateLineBotSummary.mockResolvedValue('AI Response');

      await service.handleLineWebhook(dto);

      expect(mockAiService.generateLineBotSummary).toHaveBeenCalled();
      expect(mockLineBotService.replyMessage).toHaveBeenCalledWith({
        replyToken: 'rt1',
        message: 'AI Response',
      });
    });
  });

  describe('handleStripeWebhook', () => {
    it('should handle invoice.paid for BASIC upgrade', async () => {
      const mockEvent = {
        type: 'invoice.paid',
        data: { object: { customer: 'cus_1', subscription: 'sub_1' } },
      };
      const req: any = { body: 'body', headers: { 'stripe-signature': 'sig' } };
      const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      mockStripeService.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        stripe_customer_id: 'cus_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        items: { data: [{ price: { id: 'price_1' } }] },
        current_period_end: Math.floor(Date.now() / 1000),
      });
      mockStripeService.prices.retrieve.mockResolvedValue({
        product: 'prod_1',
      });
      mockStripeService.products.retrieve.mockResolvedValue({
        name: 'Tatuga School Basic',
      });
      mockSchoolService.upgradePlanBasic.mockResolvedValue({ id: 'sch1' });
      mockStripeService.subscriptions.list.mockResolvedValue({ data: [] });

      await service.handleStripeWebhook(req, res);

      expect(mockSchoolService.upgradePlanBasic).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle customer.subscription.deleted', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: { object: { id: 'sub_1' } },
      };
      const req: any = { body: 'body', headers: { 'stripe-signature': 'sig' } };
      const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      mockStripeService.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockStripeService.invoices.list.mockResolvedValue({
        data: [{ id: 'inv_1' }],
      });
      mockSchoolService.schoolRepository.findFirst.mockResolvedValue({
        id: 'sch1',
      });
      mockSchoolService.upgradePlanFree.mockResolvedValue({ id: 'sch1' });

      await service.handleStripeWebhook(req, res);

      expect(mockStripeService.invoices.voidInvoice).toHaveBeenCalledWith(
        'inv_1',
      );
      expect(mockSchoolService.upgradePlanFree).toHaveBeenCalledWith('sch1');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
