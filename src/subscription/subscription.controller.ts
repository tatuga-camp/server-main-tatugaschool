import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { CreateSubscriptionDto, GetSubscriptionMangamentDto } from './dto';
import { SubscriptionService } from './subscription.service';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/subscriptions')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get('products')
  GetListOfSubscription() {
    return this.subscriptionService.listAllSubscription();
  }

  @Post('manage/:schoolId')
  ManageSubscription(
    @Param() dto: GetSubscriptionMangamentDto,
    @GetUser() user: User,
  ) {
    return this.subscriptionService.manageSubscription(dto, user);
  }

  @Post()
  Create(@Body() dto: CreateSubscriptionDto, @GetUser() user: User) {
    return this.subscriptionService.subscription(dto, user);
  }
}
