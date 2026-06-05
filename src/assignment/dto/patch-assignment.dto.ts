import { AssignmentStatus, AssignmentType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { normalizeTags } from '../utils/normalize-tags';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

class UpdateAssignmentBody {
  @IsOptional()
  @IsString()
  @MaxLength(999)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsDateString()
  beginDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUrl()
  videoURL?: string;

  @IsOptional()
  @IsBoolean()
  preventFastForward?: boolean;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status: AssignmentStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  @Transform(({ value }) => normalizeTags(value))
  tags?: string[];

  @IsOptional()
  @ValidateIf((o) => o.rubricId !== null)
  @IsMongoId()
  rubricId?: string | null;
}

class UpdateAssignmentQuery {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}

export class UpdateAssignmentDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAssignmentQuery)
  @ValidateNested()
  query: UpdateAssignmentQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAssignmentBody)
  @ValidateNested()
  data: UpdateAssignmentBody;
}

export class ReorderAssignmentDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  assignmentIds: string[];
}
