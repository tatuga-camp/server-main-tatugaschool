import { Injectable } from '@nestjs/common';
import * as webPush from 'web-push';
import { PushRepository, PushRepositoryType } from './push.repository';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PushService {
  pushRepository: PushRepositoryType;

  constructor(private prisma: PrismaService) {
    this.pushRepository = new PushRepository(prisma);

    webPush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }

  async sendNotification(subscription: any, payload: any) {
    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  async subscribe(data: any) {
    return await this.pushRepository.subscribe(data);
  }
}
