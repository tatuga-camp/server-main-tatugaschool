import { WordCloudAccess, WordCloudStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateWordCloudSetDto {
  @IsNotEmpty()
  @IsMongoId()
  setId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsMongoId()
  activeWordCloudId?: string;

  @IsOptional()
  @IsEnum(WordCloudStatus)
  status?: WordCloudStatus;

  @IsOptional()
  @IsEnum(WordCloudAccess)
  accessMode?: WordCloudAccess;

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;
}
