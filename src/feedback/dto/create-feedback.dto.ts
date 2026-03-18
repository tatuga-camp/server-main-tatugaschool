import { FeedbackTag } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateFileOnFeedbackDto } from '../../file-on-feedback/dto/create-file-on-feedback.dto';

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsNotEmpty()
  @IsBoolean()
  private: boolean;

  @IsEnum(FeedbackTag)
  @IsNotEmpty()
  tag: FeedbackTag;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFileOnFeedbackDto)
  files?: CreateFileOnFeedbackDto[];
}
