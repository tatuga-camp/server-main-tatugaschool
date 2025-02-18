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

  async manageSubscription(
    dto: { schoolId: string },
    user: User,
  ): Promise<{ url: string }> {
    try {
      const school = await this.schoolService.schoolRepository.findUnique({
        where: {
          id: dto.schoolId,
        },
      });

      if (!school) {
        throw new NotFoundException('School not found');
      }
      if (school.billingManagerId !== user.id) {
        throw new ForbiddenException(
          'You are not the billing manager of this school',
        );
      }
      const billingPortal = await this.stripe.billingPortal.sessions.create({
        customer: school.stripe_customer_id,
        return_url: `${process.env.CLIENT_URL}/school/${school.id}`,
      });

      return { url: billingPortal.url };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async listAllSubscription(): Promise<
    {
      title: string;
      priceId: string;
      time: Stripe.Price.Recurring.Interval;
    }[]
  > {
    try {
      const products = await this.stripe.products.list();

      const prices = await Promise.allSettled(
        products.data.map((product) =>
          this.stripe.prices.list({
            product: product.id,
          }),
        ),
      ).then((res) =>
        res
          .filter((r) => r.status === 'fulfilled')
          .map((r) => r.value.data)
          .flat(),
      );

      return prices.map((price) => {
        return {
          title: products.data.find(
            (product) => product.id === price.product.toString(),
          ).name,
          priceId: price.id,
          time: price.recurring.interval,
        };
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
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
