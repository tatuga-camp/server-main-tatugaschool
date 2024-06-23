import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsString,
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

  @IsNotEmpty()
  @IsMongoId()
  teamId: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
