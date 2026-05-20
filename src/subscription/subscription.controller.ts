import { GetUser } from '../auth/decorators';
import {
  ApplyDiscountDto,
  CreateSubscriptionDto,
  GetSubscriptionMangamentDto,
  UpgradeSubscriptionDto,
  ValidateDiscountDto,
} from './dto';
import { SubscriptionService } from './subscription.service';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';

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
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subscriptionService.manageSubscription(dto, user);
  }

  @Post('discounts/validate')
  ValidateDiscount(
    @Body() dto: ValidateDiscountDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subscriptionService.validateDiscount(dto, user);
  }

  @Post('discounts/apply')
  ApplyDiscount(
    @Body() dto: ApplyDiscountDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subscriptionService.applyDiscountToRenewal(dto, user);
  }

  @Post('upgrade/preview')
  PreviewUpgrade(
    @Body() dto: UpgradeSubscriptionDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subscriptionService.previewUpgrade(dto, user);
  }

  @Post('upgrade')
  Upgrade(
    @Body() dto: UpgradeSubscriptionDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subscriptionService.upgradeSubscription(dto, user);
  }

  @Post()
  Create(@Body() dto: CreateSubscriptionDto, @GetUser() user: UserJwtPayload) {
    return this.subscriptionService.subscription(dto, user);
  }
}
