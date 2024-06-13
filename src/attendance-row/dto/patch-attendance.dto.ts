import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UpdateAttendanceRowQuery {
  @IsNotEmpty()
  @IsMongoId()
  attendanceRowId: string;
}

class UpdateAttendanceRowBody {
  @IsOptional()
  @IsDateString()
  startDate?: Date;

  @IsOptional()
  @IsDateString()
  endDate?: Date;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAttendanceRowDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAttendanceRowQuery)
  @ValidateNested()
  query: UpdateAttendanceRowQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAttendanceRowQuery)
  @ValidateNested()
  body: UpdateAttendanceRowBody;
}
