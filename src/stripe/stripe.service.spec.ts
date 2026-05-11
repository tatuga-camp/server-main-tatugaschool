import { Test, TestingModule } from '@nestjs/testing';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

jest.mock('stripe', () => {
  return class MockStripe {
    customers = {
      create: jest.fn().mockResolvedValue({ id: 'cus_1' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_1', email: 'updated' }),
    };
  };
});

describe('StripeService', () => {
  let service: StripeService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-stripe-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<StripeService>(StripeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CreateCustomer', () => {
    it('should create stripe customer', async () => {
      const dto = { email: 'a@a.com', schoolTitle: 'S1', description: 'Desc' };
      const result = await service.CreateCustomer(dto);

      expect(service.customers.create).toHaveBeenCalledWith({
        email: 'a@a.com',
        name: 'S1',
        description: 'Desc',
      });
      expect(result.id).toBe('cus_1');
    });
  });

  describe('UpdateCustomer', () => {
    it('should update stripe customer', async () => {
      const dto = {
        query: { stripeCustomerId: 'cus_1' },
        body: { email: 'updated' },
      };
      const result = await service.UpdateCustomer(dto);

      expect(service.customers.update).toHaveBeenCalledWith('cus_1', {
        email: 'updated',
      });
      expect(result.email).toBe('updated');
    });
  });
});
