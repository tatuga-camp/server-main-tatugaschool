import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
export class CreateSubjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
  title: string;

  @IsNotEmpty()
  @IsDateString()
  educationYear: Date;

  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
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
