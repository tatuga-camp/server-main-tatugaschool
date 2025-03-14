import { Type } from 'class-transformer';
import {
  IsBoolean,
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

  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @IsOptional()
  @IsDateString()
  allowScanAt?: string;

  @IsOptional()
  @IsBoolean()
  isAllowScanManyTime?: boolean;
}

export class UpdateAttendanceRowDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAttendanceRowQuery)
  @ValidateNested()
  query: UpdateAttendanceRowQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAttendanceRowBody)
  @ValidateNested()
  body: UpdateAttendanceRowBody;
}
