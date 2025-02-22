import { Plan } from '@prisma/client';

export interface RequestCreateSchool {
  title: string;
  description: string;
  plan: Plan;
  stripe_customer_id: string;
  stripe_price_id?: string;
  stripe_subscription_id?: string;
  stripe_subscription_expireAt?: Date;
  blurHash: string;
  billingManagerId: string;
}

export type RequestUpdateSchool = {
  query: {
    schoolId: string;
  };
  body: {
    title?: string;
    description?: string;
    plan?: Plan;
    stripe_customer_id?: string;
    stripe_price_id?: string;
    totalStorage?: number;
    stripe_subscription_id?: string;
    stripe_subscription_expireAt?: Date;
  };
};
