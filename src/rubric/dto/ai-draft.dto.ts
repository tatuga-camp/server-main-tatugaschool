import {
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AiCurriculumFileDto {
  @IsNotEmpty() @IsString() url: string;
  @IsNotEmpty() @IsString() type: string;
}

export class AiDraftRubricDto {
  @IsNotEmpty() @IsMongoId() subjectId: string;
  @IsNotEmpty() @IsString() @MaxLength(300) topic: string;
  @IsNotEmpty() @IsString() @MaxLength(60) gradeLevel: string;
  @IsNotEmpty() @IsString() @MaxLength(1000) learningGoal: string;

  @IsOptional() @IsNumber() @Min(2) @Max(7) levelCount?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(12) criteriaCount?: number;
  @IsOptional() @IsNumber() @Min(1) maxPointsPerLevel?: number;
  @IsOptional() @IsString() @IsIn(['th', 'en']) language?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiCurriculumFileDto)
  curriculum?: AiCurriculumFileDto;
}
