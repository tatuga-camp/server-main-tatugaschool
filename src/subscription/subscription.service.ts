import { SchoolService } from './../school/school.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { User } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private logger: Logger;
  constructor(
    private stripe: StripeService,
    private schoolService: SchoolService,
  ) {
    this.logger = new Logger(SubscriptionService.name);
  }

  async subscription(
    dto: { priceId: string; schoolId: string },
    user: User,
  ): Promise<{ subscriptionId: string; clientSecret: string }> {
    try {
      const school = await this.schoolService.schoolRepository.findUnique({
        where: {
          id: dto.schoolId,
        },
      });

      if (!school) {
        throw new NotFoundException('school not found');
      }

      if (school.billingManagerId !== user.id) {
        throw new ForbiddenException(
          'Only the billing mananger can subscription',
        );
      }

      if (school.stripe_subscription_id) {
        const subscription = await this.stripe.subscriptions.retrieve(
          school.stripe_subscription_id,
        );

        if (subscription.status === 'active') {
          throw new BadRequestException(
            'You already have the active subscription',
          );
        }
      }

      const subscription = await this.stripe.subscriptions.create({
        customer: school.stripe_customer_id,
        items: [
          {
            price: dto.priceId,
          },
        ],
        collection_method: 'send_invoice',
        days_until_due: 0,
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['promptpay', 'card'],
        },
        expand: ['latest_invoice.payment_intent'],
      });

      const latestInvoice = subscription.latest_invoice as {
        id: string;
      };

      const invoice = await this.stripe.invoices.finalizeInvoice(
        latestInvoice.id,
      );

      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        invoice.payment_intent.toString(),
      );

      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
