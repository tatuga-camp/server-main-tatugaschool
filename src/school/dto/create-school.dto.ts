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
  @MaxLength(999)
  title: string;

  @IsNotEmpty()
  @MaxLength(999)
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
  country: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
  address: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
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
