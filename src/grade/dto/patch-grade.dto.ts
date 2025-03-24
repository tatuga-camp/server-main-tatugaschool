import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateGradeQuery {
  @IsNotEmpty()
  @IsMongoId()
  gradeRangeId: string;
}

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

class UpdateGradeBody {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => GradeRule)
  gradeRanges: GradeRule[];
}

export class UpdateGradeDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateGradeQuery)
  @ValidateNested()
  query: UpdateGradeQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateGradeBody)
  @ValidateNested()
  body: UpdateGradeBody;
}
