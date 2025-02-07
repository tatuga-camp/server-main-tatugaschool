import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
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

class UpdateScoreOnSubjectQuery {
  @IsNotEmpty()
  @IsMongoId()
  socreOnSubjectId: string;
}

class UpdateScoreOnSubjectBody {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  score?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsUrl()
  icon?: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class UpdateScoreOnSubjectDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateScoreOnSubjectQuery)
  @ValidateNested()
  query: UpdateScoreOnSubjectQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateScoreOnSubjectBody)
  @ValidateNested()
  body: UpdateScoreOnSubjectBody;
}
