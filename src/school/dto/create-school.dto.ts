import { Plan } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsUrl,
  IsPhoneNumber,
} from 'class-validator';

export class CreateSchoolDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  title: string;

  @IsNotEmpty()
  @MaxLength(300)
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  country: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  address: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  zipCode: string;

  @IsNotEmpty()
  @IsUrl()
  logo: string;

  @IsNotEmpty()
  @IsString()
  blurHash: string;

  @IsNotEmpty()
  @IsPhoneNumber()
  phoneNumber: string;
}
