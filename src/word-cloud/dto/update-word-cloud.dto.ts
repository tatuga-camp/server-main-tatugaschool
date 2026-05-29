import { WordCloudAccess, WordCloudStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateWordCloudQuery {
  @IsNotEmpty()
  @IsMongoId()
  wordCloudId: string;
}

class UpdateWordCloudBody {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  question?: string;

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

export class UpdateWordCloudDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateWordCloudQuery)
  @ValidateNested()
  query: UpdateWordCloudQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateWordCloudBody)
  @ValidateNested()
  body: UpdateWordCloudBody;
}
