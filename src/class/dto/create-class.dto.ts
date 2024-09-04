import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsMongoId,
} from 'class-validator';

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
  @IsDateString()
  educationYear: Date;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
