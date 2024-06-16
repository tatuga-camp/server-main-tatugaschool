import {
  IsNotEmpty,
  IsString,
  IsDate,
  IsOptional,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsDate()
  @Type(() => Date)
  educationYear: Date;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
