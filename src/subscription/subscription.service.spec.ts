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
      retrieveUpcoming: jest.fn(),
    },
    paymentIntents: {
      retrieve: jest.fn(),
    },
    invoiceItems: {
      create: jest.fn(),
      del: jest.fn(),
    },
    promotionCodes: {
      list: jest.fn(),
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

    it('passes the promotion code to subscriptions.create when a valid discount code is supplied', async () => {
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
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 0,
            expires_at: null,
            coupon: { valid: true, percent_off: 20 },
          },
        ],
      });
      mockStripeService.subscriptions.create.mockResolvedValue({
        id: 'sub_1',
        latest_invoice: { id: 'inv_1' },
      });
      mockStripeService.invoices.finalizeInvoice.mockResolvedValue({
        payment_intent: 'pi_1',
        amount_due: 119200,
      });
      mockStripeService.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_1',
        client_secret: 'secret_1',
      });

      await service.subscription(
        {
          priceId: 'price_1',
          schoolId: 'sch1',
          members: 1,
          discountCode: 'SUMMER20',
        },
        { id: 'u1' } as any,
      );

      expect(mockStripeService.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ promotion_code: 'promo_1' }),
      );
    });

    it('throws BadRequestException when the supplied discount code is invalid', async () => {
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
      mockStripeService.promotionCodes.list.mockResolvedValue({ data: [] });

      await expect(
        service.subscription(
          {
            priceId: 'price_1',
            schoolId: 'sch1',
            members: 1,
            discountCode: 'BADCODE',
          },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
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

  describe('validateDiscount', () => {
    it('returns a valid preview for a percent-off code on a new plan', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 0,
            expires_at: null,
            coupon: {
              valid: true,
              percent_off: 20,
              amount_off: null,
              currency: null,
              duration: 'once',
            },
          },
        ],
      });
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_1',
        product: 'prod_1',
        unit_amount: 149000,
        currency: 'thb',
      });
      mockStripeService.products.retrieve.mockResolvedValue({
        name: 'Tatuga School Premium',
      });

      const result = await service.validateDiscount(
        { code: 'SUMMER20', schoolId: 'sch1', priceId: 'price_1' },
        { id: 'u1' } as any,
      );

      expect(result).toEqual({
        valid: true,
        discount: { type: 'percent', value: 20 },
        originalAmount: 149000,
        discountedAmount: 119200,
        currency: 'thb',
      });
    });

    it('returns valid:false when the code is not found', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({ data: [] });

      const result = await service.validateDiscount(
        { code: 'NOPE', schoolId: 'sch1', priceId: 'price_1' },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });

    it('returns valid:false when the code is already fully redeemed', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 1,
            expires_at: null,
            coupon: { valid: true, percent_off: 20 },
          },
        ],
      });

      const result = await service.validateDiscount(
        { code: 'USED', schoolId: 'sch1', priceId: 'price_1' },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });

    it('throws ForbiddenException when caller is not the billing manager', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });

      await expect(
        service.validateDiscount(
          { code: 'SUMMER20', schoolId: 'sch1', priceId: 'price_1' },
          { id: 'u2' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns valid:false when the code has expired', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 0,
            expires_at: Math.floor(Date.now() / 1000) - 3600,
            coupon: { valid: true, percent_off: 20 },
          },
        ],
      });

      const result = await service.validateDiscount(
        { code: 'OLD', schoolId: 'sch1', priceId: 'price_1' },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });

    it('returns a valid preview for an amount-off code', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 0,
            expires_at: null,
            coupon: {
              valid: true,
              percent_off: null,
              amount_off: 10000,
              currency: 'thb',
            },
          },
        ],
      });
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_1',
        product: 'prod_1',
        unit_amount: 149000,
        currency: 'thb',
      });
      mockStripeService.products.retrieve.mockResolvedValue({
        name: 'Tatuga School Premium',
      });

      const result = await service.validateDiscount(
        { code: 'SAVE100', schoolId: 'sch1', priceId: 'price_1' },
        { id: 'u1' } as any,
      );

      expect(result).toEqual({
        valid: true,
        discount: { type: 'amount', value: 10000 },
        originalAmount: 149000,
        discountedAmount: 139000,
        currency: 'thb',
      });
    });

    it('returns a valid preview against an active subscription when no priceId is given', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 0,
            expires_at: null,
            coupon: { valid: true, percent_off: 20 },
          },
        ],
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        items: {
          data: [
            { quantity: 1, price: { unit_amount: 149000, currency: 'thb' } },
          ],
        },
      });

      const result = await service.validateDiscount(
        { code: 'SUMMER20', schoolId: 'sch1' },
        { id: 'u1' } as any,
      );

      expect(result).toEqual({
        valid: true,
        discount: { type: 'percent', value: 20 },
        originalAmount: 149000,
        discountedAmount: 119200,
        currency: 'thb',
      });
    });

    it('returns valid:false for the renewal path when the subscription is not active', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 0,
            expires_at: null,
            coupon: { valid: true, percent_off: 20 },
          },
        ],
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'canceled',
        items: {
          data: [
            { quantity: 1, price: { unit_amount: 149000, currency: 'thb' } },
          ],
        },
      });

      const result = await service.validateDiscount(
        { code: 'SUMMER20', schoolId: 'sch1' },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('previewUpgrade', () => {
    const activeBasicSubscription = {
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      items: {
        data: [
          {
            id: 'si_1',
            quantity: 1,
            price: {
              unit_amount: 59000,
              currency: 'thb',
              product: 'prod_basic',
              recurring: { interval: 'year' },
            },
          },
        ],
      },
    };

    it('returns the full new-plan charge, credit, and net for a valid upgrade', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue(
        activeBasicSubscription,
      );
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_premium_year',
        product: 'prod_premium',
        unit_amount: 149000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod_basic'
            ? { id: 'prod_basic', name: 'Tatuga School Basic' }
            : { id: 'prod_premium', name: 'Tatuga School Premium' },
        ),
      );
      mockStripeService.invoices.retrieveUpcoming.mockResolvedValue({
        lines: {
          data: [
            { proration: true, period: { start: 1750000000 }, amount: 124166 },
            { proration: true, period: { start: 1750000000 }, amount: -49166 },
            {
              proration: false,
              period: { start: 1752600000 },
              amount: 149000,
            },
          ],
        },
      });

      const result = await service.previewUpgrade(
        { schoolId: 'sch1', priceId: 'price_premium_year' },
        { id: 'u1' } as any,
      );

      expect(result).toEqual({
        valid: true,
        currentPlan: 'Tatuga School Basic',
        newPlan: 'Tatuga School Premium',
        prorationCharge: 149000,
        prorationCredit: 49166,
        amountDue: 99834,
        currency: 'thb',
      });
    });

    it('returns valid:false when the target plan is not an upgrade', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue(
        activeBasicSubscription,
      );
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_cheaper_year',
        product: 'prod_cheaper',
        unit_amount: 30000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod_basic'
            ? { id: 'prod_basic', name: 'Tatuga School Basic' }
            : { id: 'prod_cheaper', name: 'Cheaper Plan' },
        ),
      );

      const result = await service.previewUpgrade(
        { schoolId: 'sch1', priceId: 'price_cheaper_year' },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });

    it('returns valid:false for an Enterprise upgrade with fewer than 4 members', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue(
        activeBasicSubscription,
      );
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_ent_year',
        product: 'prod_ent',
        unit_amount: 110000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod_basic'
            ? { id: 'prod_basic', name: 'Tatuga School Basic' }
            : { id: 'prod_ent', name: 'Tatuga School Enterprise' },
        ),
      );

      const result = await service.previewUpgrade(
        { schoolId: 'sch1', priceId: 'price_ent_year', members: 2 },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });

    it('returns valid:false when there is no active subscription', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'canceled',
        customer: 'cus_1',
        items: { data: [] },
      });

      const result = await service.previewUpgrade(
        { schoolId: 'sch1', priceId: 'price_premium_year' },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });

    it('throws ForbiddenException when caller is not the billing manager', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });

      await expect(
        service.previewUpgrade(
          { schoolId: 'sch1', priceId: 'price_premium_year' },
          { id: 'u2' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns the full new-plan charge for a cross-interval upgrade', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        customer: 'cus_1',
        items: {
          data: [
            {
              id: 'si_1',
              quantity: 1,
              price: {
                unit_amount: 29000,
                currency: 'thb',
                product: 'prod_premium',
                recurring: { interval: 'month' },
              },
            },
          ],
        },
      });
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_ent_year',
        product: 'prod_ent',
        unit_amount: 110000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod_premium'
            ? { id: 'prod_premium', name: 'Tatuga School Premium' }
            : { id: 'prod_ent', name: 'Tatuga School Enterprise' },
        ),
      );
      mockStripeService.invoices.retrieveUpcoming.mockResolvedValue({
        lines: {
          data: [{ proration: true, amount: -29000 }],
        },
      });

      const result = await service.previewUpgrade(
        { schoolId: 'sch1', priceId: 'price_ent_year', members: 4 },
        { id: 'u1' } as any,
      );

      expect(result).toEqual({
        valid: true,
        currentPlan: 'Tatuga School Premium',
        newPlan: 'Tatuga School Enterprise',
        prorationCharge: 440000,
        prorationCredit: 29000,
        amountDue: 411000,
        currency: 'thb',
      });
    });

    it('computes the credit from Stripe clock, not the server clock', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue(
        activeBasicSubscription,
      );
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_premium_year',
        product: 'prod_premium',
        unit_amount: 149000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod_basic'
            ? { id: 'prod_basic', name: 'Tatuga School Basic' }
            : { id: 'prod_premium', name: 'Tatuga School Premium' },
        ),
      );
      // The proration lines carry Stripe's own clock value in
      // period.start, which does NOT match the server's Date.now().
      // The same-interval filter must rely on `proration`, not on
      // matching a server-supplied timestamp.
      mockStripeService.invoices.retrieveUpcoming.mockResolvedValue({
        lines: {
          data: [
            { proration: true, period: { start: 1750000000 }, amount: 124166 },
            { proration: true, period: { start: 1750000000 }, amount: -49166 },
            {
              proration: false,
              period: { start: 1752600000 },
              amount: 149000,
            },
          ],
        },
      });

      const result = await service.previewUpgrade(
        { schoolId: 'sch1', priceId: 'price_premium_year' },
        { id: 'u1' } as any,
      );

      // The proration must not be pinned to the server wall clock —
      // Stripe (and its test clock) owns the proration date.
      expect(
        mockStripeService.invoices.retrieveUpcoming.mock.calls[0][0],
      ).not.toHaveProperty('subscription_proration_date');
      expect(result).toEqual({
        valid: true,
        currentPlan: 'Tatuga School Basic',
        newPlan: 'Tatuga School Premium',
        prorationCharge: 149000,
        prorationCredit: 49166,
        amountDue: 99834,
        currency: 'thb',
      });
    });

    it('returns valid:false when the target is the same tier (not an upgrade)', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        customer: 'cus_1',
        items: {
          data: [
            {
              id: 'si_1',
              quantity: 1,
              price: {
                unit_amount: 29000,
                currency: 'thb',
                product: 'prod_premium',
                recurring: { interval: 'month' },
              },
            },
          ],
        },
      });
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_premium_year',
        product: 'prod_premium',
        unit_amount: 149000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockResolvedValue({
        id: 'prod_premium',
        name: 'Tatuga School Premium',
      });

      const result = await service.previewUpgrade(
        { schoolId: 'sch1', priceId: 'price_premium_year' },
        { id: 'u1' } as any,
      );

      expect(result.valid).toBe(false);
    });
  });

  describe('upgradeSubscription', () => {
    const activePremiumMonthlySubscription = {
      id: 'sub_old',
      status: 'active',
      customer: 'cus_1',
      items: {
        data: [
          {
            id: 'si_old',
            quantity: 1,
            price: {
              unit_amount: 29000,
              currency: 'thb',
              product: 'prod_premium',
              recurring: { interval: 'month' },
            },
          },
        ],
      },
    };

    function mockEnterpriseUpgradeResolution() {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_old',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue(
        activePremiumMonthlySubscription,
      );
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_ent_year',
        product: 'prod_ent',
        unit_amount: 110000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod_premium'
            ? { id: 'prod_premium', name: 'Tatuga School Premium' }
            : { id: 'prod_ent', name: 'Tatuga School Enterprise' },
        ),
      );
      mockStripeService.invoices.retrieveUpcoming.mockResolvedValue({
        lines: { data: [{ proration: true, amount: -15900 }] },
      });
    }

    it('creates a new subscription with a credit line and leaves the current subscription untouched', async () => {
      mockEnterpriseUpgradeResolution();
      mockStripeService.invoiceItems.create.mockResolvedValue({
        id: 'ii_credit',
      });
      mockStripeService.subscriptions.create.mockResolvedValue({
        id: 'sub_new',
        latest_invoice: { id: 'inv_new' },
      });
      mockStripeService.invoices.finalizeInvoice.mockResolvedValue({
        id: 'inv_new',
        payment_intent: 'pi_new',
        amount_due: 424100,
      });
      mockStripeService.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_new',
        client_secret: 'secret_new',
      });

      const result = await service.upgradeSubscription(
        { schoolId: 'sch1', priceId: 'price_ent_year', members: 4 },
        { id: 'u1' } as any,
      );

      expect(mockStripeService.invoiceItems.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_1',
          amount: -15900,
          currency: 'thb',
        }),
      );
      expect(mockStripeService.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_1',
          items: [{ price: 'price_ent_year', quantity: 4 }],
        }),
      );
      expect(mockStripeService.subscriptions.update).not.toHaveBeenCalled();
      expect(result).toEqual({
        subscriptionId: 'sub_new',
        clientSecret: 'secret_new',
        price: 424100,
      });
    });

    it('skips the credit invoice item when there is no unused credit', async () => {
      mockEnterpriseUpgradeResolution();
      mockStripeService.invoices.retrieveUpcoming.mockResolvedValue({
        lines: { data: [] },
      });
      mockStripeService.subscriptions.create.mockResolvedValue({
        id: 'sub_new',
        latest_invoice: { id: 'inv_new' },
      });
      mockStripeService.invoices.finalizeInvoice.mockResolvedValue({
        id: 'inv_new',
        payment_intent: 'pi_new',
        amount_due: 440000,
      });
      mockStripeService.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_new',
        client_secret: 'secret_new',
      });

      const result = await service.upgradeSubscription(
        { schoolId: 'sch1', priceId: 'price_ent_year', members: 4 },
        { id: 'u1' } as any,
      );

      expect(mockStripeService.invoiceItems.create).not.toHaveBeenCalled();
      expect(mockStripeService.subscriptions.create).toHaveBeenCalled();
      expect(result).toEqual({
        subscriptionId: 'sub_new',
        clientSecret: 'secret_new',
        price: 440000,
      });
    });

    it('deletes the orphaned credit invoice item when creating the new subscription fails', async () => {
      mockEnterpriseUpgradeResolution();
      mockStripeService.invoiceItems.create.mockResolvedValue({
        id: 'ii_credit',
      });
      mockStripeService.subscriptions.create.mockRejectedValue(
        new Error('stripe unavailable'),
      );
      mockStripeService.invoiceItems.del.mockResolvedValue({
        id: 'ii_credit',
        deleted: true,
      });

      await expect(
        service.upgradeSubscription(
          { schoolId: 'sch1', priceId: 'price_ent_year', members: 4 },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow('stripe unavailable');

      expect(mockStripeService.invoiceItems.del).toHaveBeenCalledWith(
        'ii_credit',
      );
    });

    it('throws BadRequestException when the target plan is not an upgrade', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_old',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue(
        activePremiumMonthlySubscription,
      );
      mockStripeService.prices.retrieve.mockResolvedValue({
        id: 'price_basic_year',
        product: 'prod_basic',
        unit_amount: 59000,
        currency: 'thb',
        recurring: { interval: 'year' },
      });
      mockStripeService.products.retrieve.mockImplementation((id: string) =>
        Promise.resolve(
          id === 'prod_premium'
            ? { id: 'prod_premium', name: 'Tatuga School Premium' }
            : { id: 'prod_basic', name: 'Tatuga School Basic' },
        ),
      );

      await expect(
        service.upgradeSubscription(
          { schoolId: 'sch1', priceId: 'price_basic_year' },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('applyDiscountToRenewal', () => {
    it('attaches the promotion code to the existing subscription', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        discount: null,
      });
      mockStripeService.promotionCodes.list.mockResolvedValue({
        data: [
          {
            id: 'promo_1',
            max_redemptions: 1,
            times_redeemed: 0,
            expires_at: null,
            coupon: { valid: true, percent_off: 20 },
          },
        ],
      });
      mockStripeService.subscriptions.update.mockResolvedValue({ id: 'sub_1' });

      const result = await service.applyDiscountToRenewal(
        { code: 'SUMMER20', schoolId: 'sch1' },
        { id: 'u1' } as any,
      );

      expect(mockStripeService.subscriptions.update).toHaveBeenCalledWith(
        'sub_1',
        { promotion_code: 'promo_1' },
      );
      expect(result).toEqual({
        success: true,
        discount: { type: 'percent', value: 20 },
      });
    });

    it('throws BadRequestException when there is no subscription on the school', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
      });

      await expect(
        service.applyDiscountToRenewal(
          { code: 'SUMMER20', schoolId: 'sch1' },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the subscription is not active', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'canceled',
        discount: null,
      });

      await expect(
        service.applyDiscountToRenewal(
          { code: 'SUMMER20', schoolId: 'sch1' },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when a discount is already applied', async () => {
      mockSchoolService.schoolRepository.findUnique.mockResolvedValue({
        id: 'sch1',
        billingManagerId: 'u1',
        stripe_subscription_id: 'sub_1',
      });
      mockStripeService.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_1',
        status: 'active',
        discount: { id: 'di_1' },
      });

      await expect(
        service.applyDiscountToRenewal(
          { code: 'SUMMER20', schoolId: 'sch1' },
          { id: 'u1' } as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
