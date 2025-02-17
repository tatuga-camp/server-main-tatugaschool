import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { RequestCreateCustomer, RequestUpdateCustomer } from './interfaces';

type StripeServiceType = {
  CreateCustomer(request: RequestCreateCustomer): Promise<Stripe.Customer>;
  UpdateCustomer(request: RequestUpdateCustomer): Promise<Stripe.Customer>;
};

@Injectable()
export class StripeService extends Stripe implements StripeServiceType {
  logger: Logger;
  constructor(private config: ConfigService) {
    super(config.get<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-04-10',
    });

    this.logger = new Logger(StripeService.name);
  }

  async CreateCustomer(
    request: RequestCreateCustomer,
  ): Promise<Stripe.Customer> {
    try {
      return await this.customers.create({
        email: request.email,
        name: request.schoolTitle,
        description: request.description,
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
      return await this.customers.update(request.query.stripeCustomerId, {
        ...request.body,
      });
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
