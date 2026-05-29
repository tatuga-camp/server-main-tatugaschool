import { WordCloudAccess } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateWordCloudDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  question: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsOptional()
  @IsEnum(WordCloudAccess)
  accessMode?: WordCloudAccess;

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;
}
