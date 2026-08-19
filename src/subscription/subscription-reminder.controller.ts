import { Controller, Post, UseGuards } from '@nestjs/common';
import { InternalGuard } from '../auth/guard/internal.guard';
import { SubscriptionReminderService } from './subscription-reminder.service';

// Deliberately NOT inside SubscriptionController: that controller is behind
// a class-level UserGuard, but this route is called by the scheduler service
// with the internal API key only.
@Controller('v1/subscriptions')
export class SubscriptionReminderController {
  constructor(private reminderService: SubscriptionReminderService) {}

  @UseGuards(InternalGuard)
  @Post('expiry-reminders/run')
  Run() {
    return this.reminderService.run();
  }
}
