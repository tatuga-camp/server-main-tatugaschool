import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  computeDaysLeft,
  dueStage,
  parseReminderStages,
  serializeReminderState,
} from './subscription-reminder.helper';
import { buildExpiryReminderEmail } from './expiry-reminder.email';

export type ExpiryReminderSummary = {
  checked: number;
  sent: number;
  skipped: number;
  failed: number;
};

const DAY_MS = 86_400_000;

@Injectable()
export class SubscriptionReminderService {
  private logger = new Logger(SubscriptionReminderService.name);

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {}

  async run(now: Date = new Date()): Promise<ExpiryReminderSummary> {
    const windowEnd = new Date(now.getTime() + 10 * DAY_MS);
    // plan-in is a required indexed-friendly field; the optional-date range
    // then evaluates on that narrowed subset (Prisma+Mongo emits $expr for
    // optional-field filters — acceptable here for a once-daily job).
    const schools = await this.prisma.school.findMany({
      where: {
        plan: { in: ['BASIC', 'PREMIUM', 'ENTERPRISE'] },
        isDeleted: false,
        stripe_subscription_expireAt: { gt: now, lte: windowEnd },
      },
    });

    const summary: ExpiryReminderSummary = {
      checked: schools.length,
      sent: 0,
      skipped: 0,
      failed: 0,
    };

    for (const school of schools) {
      try {
        const expireAt = school.stripe_subscription_expireAt as Date;
        const daysLeft = computeDaysLeft(expireAt, now);
        const stage = dueStage(daysLeft);
        const sentStages = parseReminderStages(
          school.subscriptionReminders,
          expireAt,
        );
        if (!stage || sentStages.includes(stage)) {
          summary.skipped++;
          continue;
        }
        if (!school.billingManagerId) {
          this.logger.warn(
            `School ${school.id} has no billing manager — skipping expiry reminder`,
          );
          summary.skipped++;
          continue;
        }
        const manager = await this.prisma.user.findUnique({
          where: { id: school.billingManagerId },
        });
        if (!manager) {
          this.logger.warn(
            `Billing manager ${school.billingManagerId} not found for school ${school.id}`,
          );
          summary.skipped++;
          continue;
        }

        // Atomic claim: matches only if nobody changed the state since we
        // read it. A concurrent/duplicate trigger loses the race and skips,
        // so each stage's email sends exactly once.
        const claimed = await this.prisma.school.updateMany({
          where: {
            id: school.id,
            subscriptionReminders: school.subscriptionReminders,
          },
          data: {
            subscriptionReminders: serializeReminderState(expireAt, [
              ...sentStages,
              stage,
            ]),
          },
        });
        if (claimed.count === 0) {
          summary.skipped++;
          continue;
        }

        const { subject, html } = buildExpiryReminderEmail({
          schoolTitle: school.title,
          plan: school.plan,
          daysLeft,
          expireAt,
          renewUrl: `${this.config.get('CLIENT_URL')}/school/${school.id}?menu=Subscription`,
          language: manager.language === 'th' ? 'th' : 'en',
        });
        await this.email.sendMail({ to: manager.email, subject, html });
        summary.sent++;
      } catch (error) {
        // The stage stays claimed if sendMail failed — one lost reminder is
        // preferable to duplicate emails; the next stage still fires.
        this.logger.error(
          `Expiry reminder failed for school ${school.id}`,
          (error as Error).stack,
        );
        summary.failed++;
      }
    }

    this.logger.log(
      `Expiry reminders: checked=${summary.checked} sent=${summary.sent} skipped=${summary.skipped} failed=${summary.failed}`,
    );
    return summary;
  }
}
