import { Transform } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetCareerByPageDto {
  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  page: number;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  limit: number;
}
