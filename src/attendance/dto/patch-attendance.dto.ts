import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UpdateAttendanceQuery {
  @IsNotEmpty()
  @IsMongoId()
  attendanceId: string;
}

class UpdateAttendanceBody {
  @IsOptional()
  @IsBoolean()
  absent?: boolean;

  @IsOptional()
  @IsBoolean()
  present?: boolean;

  @IsOptional()
  @IsBoolean()
  holiday?: boolean;

  @IsOptional()
  @IsBoolean()
  sick?: boolean;

  @IsOptional()
  @IsBoolean()
  late?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAttendanceDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAttendanceQuery)
  @ValidateNested()
  query: UpdateAttendanceQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateAttendanceBody)
  @ValidateNested()
  body: UpdateAttendanceBody;
}
