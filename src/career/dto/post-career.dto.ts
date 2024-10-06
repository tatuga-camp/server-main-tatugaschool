import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCareerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(9999)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(9999)
  description: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(9999)
  keywords: string;
}
