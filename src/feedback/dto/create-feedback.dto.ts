import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum FeedbackTag {
  COMPLIMENT = 'COMPLIMENT',
  BUG = 'BUG',
  REQUEST_FEATURE = 'REQUEST_FEATURE',
}

export class CreateFeedbackDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(FeedbackTag)
  @IsNotEmpty()
  tag: FeedbackTag;
}
