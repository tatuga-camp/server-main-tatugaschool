import { WordCloudAccess } from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWordCloudSetDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  questions: string[];

  @IsOptional()
  @IsEnum(WordCloudAccess)
  accessMode?: WordCloudAccess;

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;
}
