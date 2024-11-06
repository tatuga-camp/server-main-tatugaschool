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
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
