import { SchoolService } from './../school/school.service';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { School, User } from '@prisma/client';
import Stripe from 'stripe';
import { UserJwtPayload } from '../interfaces/jwt-payload';

export type DiscountInfo = { type: 'percent' | 'amount'; value: number };

export type ValidateDiscountResponse =
  | {
      valid: true;
      discount: DiscountInfo;
      originalAmount: number;
      discountedAmount: number;
      currency: string;
    }
  | { valid: false; reason: string };

export type ApplyDiscountResponse = {
  success: true;
  discount: DiscountInfo;
};

export type UpgradePreviewResponse =
  | {
      valid: true;
      currentPlan: string;
      newPlan: string;
      prorationCharge: number;
      prorationCredit: number;
      amountDue: number;
      currency: string;
    }
  | { valid: false; reason: string };

const PLAN_RANK: Record<string, number> = {
  'Tatuga School Basic': 1,
  'Tatuga School Premium': 2,
  'Tatuga School Enterprise': 3,
};

@Injectable()
export class SubscriptionService {
  private logger: Logger;
  constructor(
    private stripe: StripeService,
    @Inject(forwardRef(() => SchoolService))
    private schoolService: SchoolService,
  ) {
    this.logger = new Logger(SubscriptionService.name);
  }

  async manageSubscription(
    dto: { schoolId: string },
    user: UserJwtPayload,
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

  async checkSubscriptionStatus(
    subscriptionId: string,
  ): Promise<'active' | 'expire'> {
    try {
      const subscription =
        await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription.status === 'active' ? 'active' : 'expire';
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
          cancel_at_period_end: false,
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
      if (latestInvoice.paid) {
        return { paymentIntent: null, subscription, price: 0 };
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
    dto: {
      priceId: string;
      schoolId: string;
      members: number;
      discountCode?: string;
    },
    user: UserJwtPayload,
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

      let promotionCodeId: string | undefined;
      if (dto.discountCode) {
        const promotionCode = await this.resolvePromotionCode(
          dto.discountCode,
        );
        const issue = this.getPromotionCodeIssue(promotionCode);
        if (issue) {
          throw new BadRequestException(issue);
        }
        promotionCodeId = promotionCode!.id;
      }

      const subscription = await this.create(
        school.stripe_customer_id,
        price.id,
        quantity,
        promotionCodeId,
      );

      return {
        subscriptionId: subscription.subscription.id,
        clientSecret: subscription.paymentIntent?.client_secret ?? null,
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
    promotionCodeId?: string,
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
        ...(promotionCodeId ? { promotion_code: promotionCodeId } : {}),
        collection_method: 'send_invoice',
        days_until_due: 0,
        cancel_at_period_end: false,
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

      let paymentIntent: Stripe.PaymentIntent | null = null;
      if (invoice.payment_intent) {
        paymentIntent = await this.stripe.paymentIntents.retrieve(
          invoice.payment_intent.toString(),
        );
      }
      return { paymentIntent, subscription, price: invoice.amount_due };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async resolvePromotionCode(
    code: string,
  ): Promise<Stripe.PromotionCode | null> {
    const result = await this.stripe.promotionCodes.list({
      code,
      active: true,
      limit: 1,
    });
    return result.data[0] ?? null;
  }

  private getPromotionCodeIssue(
    promotionCode: Stripe.PromotionCode | null,
  ): string | null {
    if (!promotionCode) {
      return 'Discount code not found or no longer active';
    }
    const { max_redemptions, times_redeemed, expires_at, coupon } =
      promotionCode;
    if (
      max_redemptions !== null &&
      max_redemptions !== undefined &&
      times_redeemed >= max_redemptions
    ) {
      return 'This discount code has already been used';
    }
    if (expires_at && expires_at * 1000 < Date.now()) {
      return 'This discount code has expired';
    }
    if (!coupon || !coupon.valid) {
      return 'This discount code is no longer valid';
    }
    return null;
  }

  private couponToDiscountInfo(coupon: Stripe.Coupon): DiscountInfo {
    return coupon.percent_off
      ? { type: 'percent', value: coupon.percent_off }
      : { type: 'amount', value: coupon.amount_off ?? 0 };
  }

  private computeDiscount(
    coupon: Stripe.Coupon,
    baseAmount: number,
  ): { discount: DiscountInfo; discountedAmount: number } {
    if (coupon.percent_off) {
      return {
        discount: this.couponToDiscountInfo(coupon),
        discountedAmount: Math.round(
          baseAmount * (1 - coupon.percent_off / 100),
        ),
      };
    }
    const amountOff = coupon.amount_off ?? 0;
    return {
      discount: this.couponToDiscountInfo(coupon),
      discountedAmount: Math.max(0, baseAmount - amountOff),
    };
  }

  private async getDiscountBaseAmount(
    dto: { priceId?: string; members?: number },
    school: School,
  ): Promise<{ amount: number; currency: string } | null> {
    if (dto.priceId) {
      const price = await this.stripe.prices.retrieve(dto.priceId);
      const product = await this.stripe.products.retrieve(
        price.product.toString(),
      );
      const quantity =
        product.name === 'Tatuga School Enterprise' ? (dto.members ?? 1) : 1;
      return {
        amount: (price.unit_amount ?? 0) * quantity,
        currency: price.currency,
      };
    }
    if (school.stripe_subscription_id) {
      const subscription = await this.stripe.subscriptions.retrieve(
        school.stripe_subscription_id,
      );
      if (subscription.status !== 'active') {
        return null;
      }
      const item = subscription.items.data[0];
      if (!item) {
        return null;
      }
      return {
        amount: (item.price.unit_amount ?? 0) * (item.quantity ?? 1),
        currency: item.price.currency,
      };
    }
    return null;
  }

  async validateDiscount(
    dto: { code: string; schoolId: string; priceId?: string; members?: number },
    user: UserJwtPayload,
  ): Promise<ValidateDiscountResponse> {
    try {
      const school = await this.schoolService.schoolRepository.findUnique({
        where: { id: dto.schoolId },
      });
      if (!school) {
        throw new NotFoundException('school not found');
      }
      if (school.billingManagerId !== user.id) {
        throw new ForbiddenException(
          'Only the billing manager can apply a discount code',
        );
      }

      const promotionCode = await this.resolvePromotionCode(dto.code);
      const issue = this.getPromotionCodeIssue(promotionCode);
      if (issue) {
        return { valid: false, reason: issue };
      }
      // getPromotionCodeIssue() returns a non-null reason for a null
      // promotionCode, so reaching here guarantees it is non-null.
      const coupon = promotionCode!.coupon;

      const base = await this.getDiscountBaseAmount(dto, school);
      if (!base) {
        return {
          valid: false,
          reason: 'No plan or active subscription to apply this code to',
        };
      }

      if (
        coupon.amount_off &&
        coupon.currency &&
        coupon.currency.toLowerCase() !== base.currency.toLowerCase()
      ) {
        return {
          valid: false,
          reason: 'This discount code cannot be used for this currency',
        };
      }

      const { discount, discountedAmount } = this.computeDiscount(
        coupon,
        base.amount,
      );

      return {
        valid: true,
        discount,
        originalAmount: base.amount,
        discountedAmount,
        currency: base.currency,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  private async resolveUpgradeContext(
    dto: { schoolId: string; priceId: string; members?: number },
    user: UserJwtPayload,
  ): Promise<{
    subscription: Stripe.Subscription;
    currentItemId: string;
    currentProduct: Stripe.Product;
    targetPrice: Stripe.Price;
    targetProduct: Stripe.Product;
    targetQuantity: number;
  }> {
    const school = await this.schoolService.schoolRepository.findUnique({
      where: { id: dto.schoolId },
    });
    if (!school) {
      throw new NotFoundException('school not found');
    }
    if (school.billingManagerId !== user.id) {
      throw new ForbiddenException(
        'Only the billing manager can upgrade the plan',
      );
    }
    if (!school.stripe_subscription_id) {
      throw new BadRequestException('No active subscription to upgrade');
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      school.stripe_subscription_id,
    );
    if (subscription.status !== 'active') {
      throw new BadRequestException('No active subscription to upgrade');
    }

    const currentItem = subscription.items.data[0];
    if (!currentItem) {
      throw new BadRequestException('Current subscription has no plan item');
    }

    // Use the exact price the billing manager selected — no interval
    // normalization. An upgrade may also change the billing interval.
    const [currentProduct, targetPrice] = await Promise.all([
      this.stripe.products.retrieve(currentItem.price.product.toString()),
      this.stripe.prices.retrieve(dto.priceId),
    ]);
    const targetProduct = await this.stripe.products.retrieve(
      targetPrice.product.toString(),
    );

    // Upgrade is defined by plan tier, not by amount — comparing a
    // monthly amount with a yearly one is meaningless. An unknown
    // product name gets rank 0 so the guard fails safe.
    if (
      (PLAN_RANK[targetProduct.name] ?? 0) <=
      (PLAN_RANK[currentProduct.name] ?? 0)
    ) {
      throw new BadRequestException(
        'The selected plan is not an upgrade from your current plan',
      );
    }

    const isEnterprise = targetProduct.name === 'Tatuga School Enterprise';
    const targetQuantity = isEnterprise ? (dto.members ?? 1) : 1;
    if (isEnterprise && targetQuantity < 4) {
      throw new BadRequestException(
        'Members should not less than 4 in Enterprise plan',
      );
    }

    return {
      subscription,
      currentItemId: currentItem.id,
      currentProduct,
      targetPrice,
      targetProduct,
      targetQuantity,
    };
  }

  private async computeUnusedPlanCredit(
    subscription: Stripe.Subscription,
    currentItemId: string,
    targetPrice: Stripe.Price,
    targetQuantity: number,
  ): Promise<number> {
    // Simulate swapping the current item to the target plan purely to
    // let Stripe compute the value of the unused time on the current
    // plan. The swap is never performed — only the negative (credit)
    // proration lines are read. No subscription_proration_date is
    // passed, so Stripe computes against its own clock.
    const upcoming = await this.stripe.invoices.retrieveUpcoming({
      customer: subscription.customer.toString(),
      subscription: subscription.id,
      subscription_items: [
        {
          id: currentItemId,
          price: targetPrice.id,
          quantity: targetQuantity,
        },
      ],
      subscription_proration_behavior: 'always_invoice',
    });

    let credit = 0;
    for (const line of upcoming.lines.data) {
      if (line.proration && line.amount < 0) {
        credit += Math.abs(line.amount);
      }
    }
    return credit;
  }

  async previewUpgrade(
    dto: { schoolId: string; priceId: string; members?: number },
    user: UserJwtPayload,
  ): Promise<UpgradePreviewResponse> {
    try {
      const {
        subscription,
        currentItemId,
        currentProduct,
        targetPrice,
        targetProduct,
        targetQuantity,
      } = await this.resolveUpgradeContext(dto, user);

      // An upgrade always creates a new subscription, so it is priced
      // at the full new-plan price minus a credit for the unused time
      // on the current plan.
      const prorationCredit = await this.computeUnusedPlanCredit(
        subscription,
        currentItemId,
        targetPrice,
        targetQuantity,
      );
      const prorationCharge =
        (targetPrice.unit_amount ?? 0) * targetQuantity;

      return {
        valid: true,
        currentPlan: currentProduct.name,
        newPlan: targetProduct.name,
        prorationCharge,
        prorationCredit,
        amountDue: prorationCharge - prorationCredit,
        currency: targetPrice.currency,
      };
    } catch (error) {
      // resolveUpgradeContext throws BadRequestException for every
      // business-rule failure (no active subscription, not an upgrade,
      // Enterprise < 4) — surface those as a correctable
      // { valid: false } result. Everything else (auth, Stripe errors)
      // is logged and rethrown.
      if (error instanceof BadRequestException) {
        return { valid: false, reason: error.message };
      }
      this.logger.error(error);
      throw error;
    }
  }

  async upgradeSubscription(
    dto: { schoolId: string; priceId: string; members?: number },
    user: UserJwtPayload,
  ): Promise<{
    subscriptionId: string;
    clientSecret: string | null;
    price: number;
  }> {
    try {
      const {
        subscription,
        currentItemId,
        currentProduct,
        targetPrice,
        targetQuantity,
      } = await this.resolveUpgradeContext(dto, user);

      const credit = await this.computeUnusedPlanCredit(
        subscription,
        currentItemId,
        targetPrice,
        targetQuantity,
      );

      // Add the unused-plan credit as a negative invoice item so Stripe
      // sweeps it into the new subscription's first invoice.
      let creditInvoiceItemId: string | null = null;
      if (credit > 0) {
        const creditItem = await this.stripe.invoiceItems.create({
          customer: subscription.customer.toString(),
          amount: -credit,
          currency: targetPrice.currency,
          description: `Credit for unused ${currentProduct.name} time`,
        });
        creditInvoiceItemId = creditItem.id;
      }

      // Create a NEW subscription for the target plan. The current
      // subscription is left untouched; the invoice.paid webhook
      // promotes the school and cancels the old subscription once the
      // new subscription's invoice is paid.
      let result: {
        paymentIntent: Stripe.PaymentIntent | null;
        subscription: Stripe.Subscription;
        price: number;
      };
      try {
        result = await this.create(
          subscription.customer.toString(),
          targetPrice.id,
          targetQuantity,
        );
      } catch (error) {
        // Roll back the orphaned credit so it cannot leak onto the
        // customer's next unrelated invoice.
        if (creditInvoiceItemId) {
          await this.stripe.invoiceItems
            .del(creditInvoiceItemId)
            .catch(() => undefined);
        }
        throw error;
      }

      return {
        subscriptionId: result.subscription.id,
        clientSecret: result.paymentIntent?.client_secret ?? null,
        price: result.price,
      };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async applyDiscountToRenewal(
    dto: { code: string; schoolId: string },
    user: UserJwtPayload,
  ): Promise<ApplyDiscountResponse> {
    try {
      const school = await this.schoolService.schoolRepository.findUnique({
        where: { id: dto.schoolId },
      });
      if (!school) {
        throw new NotFoundException('school not found');
      }
      if (school.billingManagerId !== user.id) {
        throw new ForbiddenException(
          'Only the billing manager can apply a discount code',
        );
      }
      if (!school.stripe_subscription_id) {
        throw new BadRequestException(
          'No active subscription to apply this code to',
        );
      }

      const subscription = await this.stripe.subscriptions.retrieve(
        school.stripe_subscription_id,
      );
      if (subscription.status !== 'active') {
        throw new BadRequestException(
          'No active subscription to apply this code to',
        );
      }
      if (subscription.discount) {
        throw new BadRequestException(
          'A discount is already applied to your plan',
        );
      }

      const promotionCode = await this.resolvePromotionCode(dto.code);
      const issue = this.getPromotionCodeIssue(promotionCode);
      if (issue) {
        throw new BadRequestException(issue);
      }

      await this.stripe.subscriptions.update(school.stripe_subscription_id, {
        promotion_code: promotionCode!.id,
      });

      const discount = this.couponToDiscountInfo(promotionCode!.coupon);

      return { success: true, discount };
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
