import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceRowId: string;

  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(99)
  status: string;

  @IsOptional()
  @IsString()
  note?: string;
}
