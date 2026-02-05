import { AssignmentStatus, AssignmentType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
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
