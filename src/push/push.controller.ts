import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PushService } from './push.service';
import { UserGuard } from '../auth/guard';
import { GetUser } from 'src/auth/decorators';
import { User } from '@prisma/client';

@UseGuards(UserGuard)
@Controller('v1/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  subscribe(@GetUser() user: User, @Body() data: any) {
    return this.pushService.subscribe({ data: data, userId: user.id });
  }

  @Post('send')
  async sendNotification(@Body() body: any) {
    const { subscription, message } = body;
    console.log(subscription, message);

    await this.pushService.sendNotification(subscription, {
      title: 'New Notification',
      body: 'message',
      icon: 'https://cdn.glitch.com/614286c9-b4fc-4303-a6a9-a4cef0601b74%2Flogo.png?v=1605150951230',
    });
    return { success: true };
  }
}
