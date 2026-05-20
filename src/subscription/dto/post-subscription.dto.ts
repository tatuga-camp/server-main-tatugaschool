import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsString()
  priceId: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(1)
  members: number;

  @IsOptional()
  @IsString()
  discountCode?: string;
}

export class ValidateDiscountDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsOptional()
  @IsString()
  priceId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  members?: number;
}

export class ApplyDiscountDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class UpgradeSubscriptionDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsNotEmpty()
  @IsString()
  priceId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  members?: number;
}
