import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { IsEducationYear } from '../../custom-validate';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  level: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsEducationYear()
  educationYear: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
