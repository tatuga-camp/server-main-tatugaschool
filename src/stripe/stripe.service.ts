import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { RequestCreateCustomer, RequestUpdateCustomer } from './interfaces';

type StripeServiceType = {
  CreateCustomer(request: RequestCreateCustomer): Promise<Stripe.Customer>;
  UpdateCustomer(request: RequestUpdateCustomer): Promise<Stripe.Customer>;
};

@Injectable()
export class StripeService implements StripeServiceType {
  stripe: Stripe;
  logger: Logger;
  constructor(private config: ConfigService) {
    this.stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });
    this.logger = new Logger(StripeService.name);
  }

  async CreateCustomer(
    request: RequestCreateCustomer,
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email: request.email,
        name: request.name,
        description: `School Name: ${request.schoolTitle}`,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async UpdateCustomer(
    request: RequestUpdateCustomer,
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(
        request.query.stripeCustomerId,
        {
          ...request.body,
        },
      );
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
