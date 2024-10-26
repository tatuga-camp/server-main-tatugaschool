import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateScoreOnSubjectDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  score: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title: string;

  @IsNotEmpty()
  @IsUrl()
  icon: string;

  @IsNotEmpty()
  @IsString()
  blurHash: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
