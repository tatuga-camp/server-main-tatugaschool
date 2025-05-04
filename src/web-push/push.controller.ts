import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { UserGuard } from '../auth/guard';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { PushSubscription } from './interfaces';
import { SubscribeNotificationDto } from './dto';

@UseGuards(UserGuard)
@Controller('v1/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  subscribe(@GetUser() user: User, @Body() data: SubscribeNotificationDto) {
    return this.pushService.subscribe(data, user);
  }
}
