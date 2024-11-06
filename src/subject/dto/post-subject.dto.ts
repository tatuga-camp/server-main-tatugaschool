import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { IsEducationYear } from '../../custom-validate';
export class CreateSubjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  title: string;

  @IsNotEmpty()
  @IsEducationYear()
  eduYear: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  description: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsOptional()
  @IsUrl()
  backgroundImage: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
