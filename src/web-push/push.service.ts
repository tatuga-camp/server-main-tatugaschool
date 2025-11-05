import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as webPush from 'web-push';
import { PushRepository } from './push.repository';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionNotification, User } from '@prisma/client';
import { PushSubscription } from './interfaces';

@Injectable()
export class PushService {
  pushRepository: PushRepository;
  private logger: Logger;
  constructor(private prisma: PrismaService) {
    this.pushRepository = new PushRepository(prisma);

    webPush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    this.logger = new Logger(PushService.name);
  }

  async sendNotification(
    subscription: PushSubscription | string,
    payload: { title: string; body: string; url: URL; groupId: string },
  ) {
    const { endpoint } = JSON.parse(subscription as string);
    try {
      await webPush.sendNotification(
        JSON.parse(subscription as string),
        JSON.stringify({
          ...payload,
          icon: 'https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png',
        }),
      );
    } catch (error) {
      if (error?.statusCode === 410) {
        const subscription = await this.pushRepository.findFirst({
          where: {
            endpoint: endpoint,
          },
        });
        await this.pushRepository.delete({
          where: {
            id: subscription.id,
          },
        });
      } else {
        this.logger.error('Error sending notification:', error);
      }
    }
  }

  async subscribe(
    dto: { payload: PushSubscription; userAgent: string },
    user: User,
  ): Promise<SubscriptionNotification> {
    try {
      if (!dto.payload.endpoint) {
        throw new BadRequestException('Invalid payload');
      }

      const expiredAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      const existingSubscription = await this.pushRepository.findFirst({
        where: {
          endpoint: dto.payload.endpoint,
          userId: user.id,
        },
      });

      let subscription: SubscriptionNotification;
      if (existingSubscription) {
        subscription = await this.pushRepository.update({
          where: {
            id: existingSubscription.id,
          },
          data: {
            expiredAt: expiredAt,
            data: JSON.stringify(dto.payload),
            userAgent: dto.userAgent,
          },
        });
      } else {
        subscription = await this.pushRepository.create({
          data: {
            endpoint: dto.payload.endpoint,
            expiredAt: expiredAt,
            data: JSON.stringify(dto.payload),
            userAgent: dto.userAgent,
            userId: user.id,
          },
        });
      }

      await this.sendNotification(subscription.data as PushSubscription, {
        title: 'Thanks for allowing notification',
        body: "You'll receive notification from us",
        url: new URL(process.env.CLIENT_URL),
        groupId: user.id,
      });

      return subscription;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
