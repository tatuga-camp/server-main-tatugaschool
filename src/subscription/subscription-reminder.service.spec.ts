import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionReminderService } from './subscription-reminder.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { serializeReminderState } from './subscription-reminder.helper';

jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('SubscriptionReminderService', () => {
  let service: SubscriptionReminderService;

  const now = new Date('2026-08-19T02:00:00.000Z');
  const day = 86_400_000;

  const mockPrisma = {
    school: { findMany: jest.fn(), updateMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  const mockEmail = { sendMail: jest.fn() };
  const mockConfig = {
    get: jest.fn((key: string) =>
      key === 'CLIENT_URL' ? 'https://app.tatugaschool.com' : undefined,
    ),
  };

  const school = (overrides: Record<string, unknown> = {}) => ({
    id: 'sch1',
    title: 'Tatuga Academy',
    plan: 'PREMIUM',
    billingManagerId: 'u1',
    stripe_subscription_expireAt: new Date(now.getTime() + 10 * day),
    subscriptionReminders: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionReminderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(SubscriptionReminderService);
  });

  afterEach(() => jest.clearAllMocks());

  it('sends the stage-10 email and claims the stage atomically', async () => {
    const s = school();
    mockPrisma.school.findMany.mockResolvedValue([s]);
    mockPrisma.school.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'manager@example.com',
    });
    mockEmail.sendMail.mockResolvedValue(undefined);

    const summary = await service.run(now);

    expect(mockPrisma.school.updateMany).toHaveBeenCalledWith({
      where: { id: 'sch1', subscriptionReminders: null },
      data: {
        subscriptionReminders: serializeReminderState(
          s.stripe_subscription_expireAt,
          [10],
        ),
      },
    });
    expect(mockEmail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'manager@example.com',
        subject: 'Your Tatuga School subscription expires in 10 days',
      }),
    );
    expect(summary).toEqual({ checked: 1, sent: 1, skipped: 0, failed: 0 });
  });

  it('skips when the due stage was already sent for this expiry', async () => {
    const expireAt = new Date(now.getTime() + 9 * day);
    mockPrisma.school.findMany.mockResolvedValue([
      school({
        stripe_subscription_expireAt: expireAt,
        subscriptionReminders: serializeReminderState(expireAt, [10]),
      }),
    ]);

    const summary = await service.run(now);

    expect(mockPrisma.school.updateMany).not.toHaveBeenCalled();
    expect(mockEmail.sendMail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it('sends again after renewal changed the expiry date (stages reset)', async () => {
    const oldExpire = new Date(now.getTime() - 20 * day);
    const newExpire = new Date(now.getTime() + 3 * day);
    mockPrisma.school.findMany.mockResolvedValue([
      school({
        stripe_subscription_expireAt: newExpire,
        subscriptionReminders: serializeReminderState(oldExpire, [10, 3, 1]),
      }),
    ]);
    mockPrisma.school.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'manager@example.com',
    });

    const summary = await service.run(now);

    expect(summary.sent).toBe(1);
    expect(mockEmail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your Tatuga School subscription expires in 3 days',
      }),
    );
  });

  it('skips without sending when another run claimed the stage first', async () => {
    mockPrisma.school.findMany.mockResolvedValue([school()]);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'manager@example.com',
    });
    mockPrisma.school.updateMany.mockResolvedValue({ count: 0 });

    const summary = await service.run(now);

    expect(mockEmail.sendMail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it('skips schools without a billing manager', async () => {
    mockPrisma.school.findMany.mockResolvedValue([
      school({ billingManagerId: null }),
    ]);

    const summary = await service.run(now);

    expect(mockEmail.sendMail).not.toHaveBeenCalled();
    expect(summary.skipped).toBe(1);
  });

  it('continues after a per-school failure', async () => {
    mockPrisma.school.findMany.mockResolvedValue([
      school({ id: 'bad' }),
      school({ id: 'good' }),
    ]);
    mockPrisma.school.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce({ id: 'u1', email: 'manager@example.com' });

    const summary = await service.run(now);

    expect(summary).toEqual({ checked: 2, sent: 1, skipped: 0, failed: 1 });
  });

  it('uses singular wording at 1 day left', async () => {
    mockPrisma.school.findMany.mockResolvedValue([
      school({ stripe_subscription_expireAt: new Date(now.getTime() + 1) }),
    ]);
    mockPrisma.school.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'manager@example.com',
    });

    await service.run(now);

    expect(mockEmail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Your Tatuga School subscription expires in 1 day',
      }),
    );
  });
});
