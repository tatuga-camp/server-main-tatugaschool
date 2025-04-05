import { IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum FeedbackTag {
  COMPLIMENT = 'COMPLIMENT',
  BUG = 'BUG',
  REQUEST_FEATURE = 'REQUEST_FEATURE',
}

export class QueryFeedbackDto {
  @IsOptional()
  @IsEnum(FeedbackTag)
  tag?: FeedbackTag;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
