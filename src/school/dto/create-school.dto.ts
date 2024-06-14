import { Plan } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
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
}
