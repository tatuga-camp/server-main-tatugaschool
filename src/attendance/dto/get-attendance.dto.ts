import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class GetAttendanceByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceId: string;
}

export class GetAttendanceExportExcelDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
