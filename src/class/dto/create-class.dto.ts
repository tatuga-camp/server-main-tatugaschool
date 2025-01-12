import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { IsClassLevel, IsEducationYear } from '../../custom-validate';

export class CreateClassDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsClassLevel()
  level: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
