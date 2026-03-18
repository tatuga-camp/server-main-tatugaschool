import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateFileOnFeedbackDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber()
  @IsNotEmpty()
  size: number;
}
