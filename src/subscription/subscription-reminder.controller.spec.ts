import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionReminderController } from './subscription-reminder.controller';
import { SubscriptionReminderService } from './subscription-reminder.service';
import { InternalGuard } from '../auth/guard/internal.guard';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('SubscriptionReminderController', () => {
  let controller: SubscriptionReminderController;
  const mockService = { run: jest.fn() };
  const mockConfigService = { get: jest.fn().mockReturnValue('test-key') };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionReminderController],
      providers: [
        { provide: SubscriptionReminderService, useValue: mockService },
        { provide: ConfigService, useValue: mockConfigService },
        InternalGuard,
      ],
    }).compile();
    controller = module.get(SubscriptionReminderController);
  });

  it('delegates to the reminder service', async () => {
    const summary = { checked: 2, sent: 1, skipped: 1, failed: 0 };
    mockService.run.mockResolvedValue(summary);
    await expect(controller.Run()).resolves.toEqual(summary);
  });
});
