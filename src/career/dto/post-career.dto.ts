import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCareerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(9999)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(9999)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9999)
  keywords?: string;
}
