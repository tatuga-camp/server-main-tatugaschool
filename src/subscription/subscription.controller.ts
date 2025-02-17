import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { CreateSubscriptionDto } from './dto';
import { SubscriptionService } from './subscription.service';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Post()
  Create(@Body() dto: CreateSubscriptionDto, @GetUser() user: User) {
    return this.subscriptionService.subscription(dto, user);
  }
}
