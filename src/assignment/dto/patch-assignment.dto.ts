import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
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
  @MaxLength(3999)
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

  @IsOptional()
  @IsDateString()
  beginDate?: string;

  @IsOptional()
  @IsBoolean()
  isAllowDeleteWork?: boolean;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
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
