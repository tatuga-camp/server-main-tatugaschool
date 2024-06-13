import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAttendanceRowDto {
  @IsNotEmpty()
  @IsDateString()
  startDate: Date;

  @IsNotEmpty()
  @IsDateString()
  endDate: Date;

  @IsOptional()
  @IsString()
  note?: string;

  @IsNotEmpty()
  @IsMongoId()
  attendanceTableId: string;

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
