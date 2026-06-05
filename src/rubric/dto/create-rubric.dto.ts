import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateRubricLevelDto {
  @IsNotEmpty() @IsString() @MaxLength(120) title: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsNumber() @Min(0) points: number;
  @IsNumber() order: number;
}

export class CreateRubricCriterionDto {
  @IsNotEmpty() @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsNumber() @Min(0) weight: number;
  @IsNumber() order: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => CreateRubricLevelDto)
  levels: CreateRubricLevelDto[];
}

export class CreateRubricDto {
  @IsNotEmpty() @IsString() @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsNotEmpty() @IsMongoId() subjectId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRubricCriterionDto)
  criteria: CreateRubricCriterionDto[];
}
