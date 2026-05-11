import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { StripeService } from '../stripe/stripe.service';
import { SchoolService } from '../school/school.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockStripeService = {
    billingPortal: {
      sessions: { create: jest.fn() },
    },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    products: {
      list: jest.fn(),
      retrieve: jest.fn(),
    },
    prices: {
      list: jest.fn(),
      retrieve: jest.fn(),
    },
    subscriptionItems: {
      list: jest.fn(),
    },
    invoices: {
      finalizeInvoice: jest.fn(),
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
  };

  const mockSchoolService = {
    schoolRepository: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: StripeService, useValue: mockStripeService },
        { provide: SchoolService, useValue: mockSchoolService },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('manageSubscription', () => {
    it('should create billing portal session', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_customer_id: 'cus_1',
      });
      mockStripeService.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.com',
      });

      const result = await service.manageSubscription({ schoolId: 'sch1' }, {
        id: 'u1',
      } as any);

      expect(
        mockStripeService.billingPortal.sessions.create,
      ).toHaveBeenCalled();
      expect(result.url).toBe('https://billing.com');
    });

    it('should throw ForbiddenException if user is not billing manager', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });

      await expect(
        service.manageSubscription({ schoolId: 'sch1' }, { id: 'u2' } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkSubscriptionStatus', () => {
    it('should return active', async () => {
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        status: 'active',
      });

      const result = await service.checkSubscriptionStatus('sub_1');
      expect(result).toBe('active');
    });

    it('should return expire', async () => {
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        status: 'canceled',
      });

      const result = await service.checkSubscriptionStatus('sub_1');
      expect(result).toBe('expire');
    });
  });

  describe('listAllSubscription', () => {
    it('should return available products and prices', async () => {
      mockStripeService.products.list.mockResolvedValue({
        data: [{ id: 'prod_1', name: 'Premium' }],
      });
      mockStripeService.prices.list.mockResolvedValue({
        data: [
          {
            id: 'price_1',
            product: 'prod_1',
            recurring: { interval: 'month' },
          },
        ],
      });

      const result = await service.listAllSubscription();

      expect(result).toEqual([
        { title: 'Premium', priceId: 'price_1', time: 'month' },
      ]);
    });
  });

  describe('updateMember', () => {
    it('should update subscription and generate invoice', async () => {
      const mockSchool = {
        stripe_subscription_id: 'sub_1',
        limitSchoolMember: 5,
      } as any;

      mockStripeService.subscriptionItems.list.mockResolvedValue({
        data: [{ id: 'si_1' }],
      });

      const mockLatestInvoice = {
        status: 'draft',
        paid: false,
        id: 'inv_1',
        payment_intent: 'pi_1',
      };
      mockStripeService.subscriptions.update.mockResolvedValue({
        latest_invoice: mockLatestInvoice,
      });
      mockStripeService.invoices.finalizeInvoice.mockResolvedValue({
        payment_intent: 'pi_1',
        amount_due: 1000,
      });
      mockStripeService.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_1',
      });

      const result = await service.updateMember(10, mockSchool, 'price_1');

      expect(mockStripeService.subscriptions.update).toHaveBeenCalled();
      expect(result.price).toBe(1000);
      expect(result.paymentIntent?.id).toBe('pi_1');
    });

    it('should throw BadRequestException if no subscription', async () => {
      const mockSchool = { limitSchoolMember: 5 } as any;
      await expect(
        service.updateMember(10, mockSchool, 'price_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if member count unchanged', async () => {
      const mockSchool = {
        stripe_subscription_id: 'sub_1',
        limitSchoolMember: 10,
      } as any;
      await expect(
        service.updateMember(10, mockSchool, 'price_1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('subscription', () => {
    it('should create new subscription', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_customer_id: 'cus_1',
      });
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_1',
        product: 'prod_1',
      });
      mockStripeService.products.retrieve.mockResolvedValue({
        name: 'Premium',
      });

      const mockLatestInvoice = { id: 'inv_1' };
      mockStripeService.subscriptions.create.mockResolvedValue({
        latest_invoice: mockLatestInvoice,
      });
      mockStripeService.invoices.finalizeInvoice.mockResolvedValue({
        payment_intent: 'pi_1',
        amount_due: 1000,
      });
      mockStripeService.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_1',
        client_secret: 'secret_1',
      });

      const result = await service.subscription(
        { priceId: 'price_1', schoolId: 'sch1', members: 1 },
        { id: 'u1' } as any,
      );

      expect(mockStripeService.subscriptions.create).toHaveBeenCalled();
      expect(result.clientSecret).toBe('secret_1');
    });

    it('should throw BadRequestException if enterprise with less than 4 members', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_1',
        product: 'prod_1',
      });
      mockStripeService.products.retrieve.mockResolvedValue({
        name: 'Tatuga School Enterprise',
      });

      await expect(
        service.subscription(
          { priceId: 'price_1', schoolId: 'sch1', members: 3 },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
