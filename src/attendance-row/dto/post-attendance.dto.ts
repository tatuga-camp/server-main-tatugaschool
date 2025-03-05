import { AttendanceType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
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
  @MaxLength(9999)
  note?: string;

  @IsNotEmpty()
  @IsEnum(AttendanceType)
  type: AttendanceType;

  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @IsOptional()
  @IsDateString()
  allowScanAt?: string;

  @IsOptional()
  @IsBoolean()
  isAllowScanManyTime?: boolean;

  @IsNotEmpty()
  @IsMongoId()
  attendanceTableId: string;
}
