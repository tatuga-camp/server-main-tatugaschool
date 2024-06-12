import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAttendanceTableDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(599)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(999)
  description?: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  teamId: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
