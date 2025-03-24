import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class GradeRule {
  @IsNotEmpty()
  @IsNumber()
  min: number;

  @IsNotEmpty()
  @IsNumber()
  max: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  grade: string;
}

export class CreateGradeDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => GradeRule)
  gradeRanges: GradeRule[];
}
