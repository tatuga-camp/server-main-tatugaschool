import { SchoolService } from './../school/school.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { School, User } from '@prisma/client';
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
            active: true,
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

  async updateMember(
    members: number,
    school: School,
    priceId: string,
  ): Promise<{
    paymentIntent: Stripe.PaymentIntent | null;
    subscription: Stripe.Subscription;
    price: number;
  }> {
    try {
      if (!school.stripe_subscription_id) {
        throw new BadRequestException(
          "Your school hasn't had any subscription",
        );
      }

      if (school.limitSchoolMember === members) {
        throw new BadRequestException(
          'Please make change on the number of members',
        );
      }

      const subscriptionItems = await this.stripe.subscriptionItems.list({
        limit: 1,
        subscription: school.stripe_subscription_id,
      });
      const subscription = await this.stripe.subscriptions.update(
        school.stripe_subscription_id,
        {
          items: [
            {
              id: subscriptionItems.data[0].id,
              quantity: members,
              price: priceId,
            },
          ],
          proration_behavior: 'always_invoice',
          collection_method: 'send_invoice',
          days_until_due: 0,
          expand: ['latest_invoice.payment_intent'],
        },
      );

      const latestInvoice = subscription.latest_invoice as Stripe.Invoice;
      console.log('latestInvoice', latestInvoice);
      if (latestInvoice.status === 'open') {
        throw new BadRequestException(
          "You've already attemp to buy this plan, please paid the invoice",
        );
      }

      const invoice = await this.stripe.invoices.finalizeInvoice(
        latestInvoice.id,
      );

      if (!invoice.payment_intent) {
        return { paymentIntent: null, subscription, price: 0 };
      }
      const paymentIntent = await this.stripe.paymentIntents.retrieve(
        invoice.payment_intent.toString(),
      );
      return { paymentIntent, subscription, price: invoice.amount_due };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async subscription(
    dto: { priceId: string; schoolId: string; members: number },
    user: User,
  ): Promise<{
    subscriptionId: string;
    clientSecret: string | null;
    price: number;
  }> {
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

      const price = await this.stripe.prices.retrieve(dto.priceId);

      if (!price) {
        throw new NotFoundException('Price is not found');
      }

      const product = await this.stripe.products.retrieve(
        price.product.toString(),
      );

      let quantity = 1;

      if (product.name === 'Tatuga School Enterprise') {
        quantity = dto.members;
      }

      if (product.name === 'Tatuga School Enterprise' && dto.members < 4) {
        throw new BadRequestException(
          'Members should not less than 4 in Enterprise plam',
        );
      }

      if (school.stripe_subscription_id !== null) {
        const subscription = await this.updateMember(
          quantity,
          school,
          price.id,
        );
        return {
          subscriptionId: subscription.subscription.id,
          clientSecret: subscription.paymentIntent
            ? subscription.paymentIntent.client_secret
            : null,
          price: subscription.price,
        };
      }

      const subscription = await this.create(
        school.stripe_customer_id,
        price.id,
        quantity,
      );
      // const date = new Date(
      //   subscription.subscription.current_period_end * 1000,
      // );

      // await this.schoolService.schoolRepository.update({
      //   where: {
      //     id: school.id,
      //   },
      //   data: {
      //     stripe_subscription_id: subscription.subscription.id,
      //     stripe_subscription_expireAt: date,
      //     stripe_price_id: subscription.subscription.items.data[0].price.id,
      //   },
      // });

      return {
        subscriptionId: subscription.subscription.id,
        clientSecret: subscription.paymentIntent.client_secret,
        price: subscription.price,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async create(
    stripe_customer_id: string,
    priceId: string,
    quantity: number,
  ): Promise<{
    paymentIntent: Stripe.PaymentIntent | null;
    subscription: Stripe.Subscription;
    price: number;
  }> {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: stripe_customer_id,
        items: [
          {
            price: priceId,
            quantity: quantity,
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
      return { paymentIntent, subscription, price: invoice.amount_due };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
