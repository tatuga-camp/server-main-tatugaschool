import { Plan } from '@prisma/client';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateSchoolDto {
  @IsString()
  readonly title: string;

  @IsString()
  readonly description: string;

  @IsString()
  readonly plan: Plan;

  @IsString()
  readonly stripe_customer_id: string;

  @IsOptional()
  @IsString()
  readonly stripe_price_id?: string;

  @IsOptional()
  @IsString()
  readonly stripe_subscription_id?: string;

  @IsOptional()
  @IsDateString()
  readonly stripe_subscription_expireAt?: Date;
}
