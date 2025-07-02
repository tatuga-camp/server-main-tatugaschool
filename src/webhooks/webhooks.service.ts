import { Injectable, RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeService } from '../stripe/stripe.service';
import { SchoolService } from './../school/school.service';

@Injectable()
export class WebhooksService {
  constructor(
    private stripe: StripeService,
    private schoolService: SchoolService,
  ) {}

  async handleStripeWebhook(req: RawBodyRequest<Request>, res: Response) {
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.body,
        req.headers['stripe-signature'],
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error(err);
      console.log(`⚠️  Webhook signature verification failed.`);
      console.log(
        `⚠️  Check the env file and enter the correct webhook secret.`,
      );
    }
    const dataObject = event.data.object;
    switch (event.type) {
      case 'invoice.paid':
        const invoicePaid = dataObject as Stripe.Invoice;

        let school = await this.schoolService.schoolRepository.findUnique({
          where: {
            stripe_customer_id: invoicePaid.customer.toString(),
          },
        });

        if (!school) {
          res.status(400).send('stripe_customer_id not found on School');
          break;
        }

        const subscription = await this.stripe.subscriptions.retrieve(
          invoicePaid.subscription.toString(),
        );
        const price = await this.stripe.prices.retrieve(
          subscription.items.data[0].price.id,
        );
        const product = await this.stripe.products.retrieve(
          price.product.toString(),
        );
        const date = new Date(subscription.current_period_end * 1000);
        if (product.name === 'Tatuga School Basic') {
          school = await this.schoolService.upgradePlanBasic(
            school.id,
            date,
            price.id,
            subscription.id,
          );
        }
        if (product.name === 'Tatuga School Premium') {
          school = await this.schoolService.upgradePlanPremium(
            school.id,
            date,
            price.id,
            subscription.id,
          );
        }
        if (product.name === 'Tatuga School Enterprise') {
          school = await this.schoolService.upgradePlanEnterprise(
            school.id,
            date,
            price.id,
            subscription.id,
            subscription.items.data[0].quantity,
          );
        }
        const subscriptions = await this.stripe.subscriptions.list({
          customer: school.stripe_customer_id,
          status: 'all',
        });
        const activeSubscriptions = subscriptions.data
          .filter((sub) => sub.status === 'active' || sub.status === 'past_due')
          .filter((s) => s.id !== subscription.id);
        for (const oldSub of activeSubscriptions) {
          await this.stripe.subscriptions.cancel(oldSub.id);
        }

        res.status(200).send(school);
        break;

      case 'customer.subscription.deleted':
        const subscriptionDelete = dataObject as Stripe.Subscription;
        const all_invoices = await this.stripe.invoices.list({
          subscription: subscriptionDelete.id,
          limit: 20,
          status: 'open',
        });

        for (const latest_invoice of all_invoices.data) {
          await this.stripe.invoices.voidInvoice(latest_invoice.id);
        }

        let school_subscription_delete =
          await this.schoolService.schoolRepository.findFirst({
            where: {
              stripe_subscription_id: subscriptionDelete.id,
            },
          });

        if (!school_subscription_delete) {
          res.status(200).send('stripe_subscription_id not found on School');
          break;
        }

        school_subscription_delete = await this.schoolService.upgradePlanFree(
          school_subscription_delete.id,
        );
        res.status(200).send(school_subscription_delete);
        break;

      case 'invoice.updated':
        const invoiceUpdate = dataObject as Stripe.Invoice;
        if (invoiceUpdate.status === 'uncollectible') {
          await this.stripe.invoices.voidInvoice(invoiceUpdate.id);
        }
        res.status(200).send('Updated Invoice');

        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
}
