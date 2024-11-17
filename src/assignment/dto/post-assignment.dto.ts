import { AssignmentType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(3999)
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  maxScore: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  weight: number;

  @IsNotEmpty()
  @IsDateString()
  beginDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsEnum(AssignmentType)
  type: AssignmentType;
}
