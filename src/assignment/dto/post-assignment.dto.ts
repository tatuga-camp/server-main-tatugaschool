import { AssignmentStatus, AssignmentType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
  title: string;

  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  weight?: number;

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

  @IsNotEmpty()
  @IsEnum(AssignmentStatus)
  status: AssignmentStatus;

  @IsOptional()
  @IsUrl()
  videoURL?: string;

  @IsOptional()
  @IsBoolean()
  preventFastForward?: boolean;
}
