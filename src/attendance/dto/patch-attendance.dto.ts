import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
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
  @IsString()
  status: string;

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

export class UpdateManyDto {
  @IsArray()
  @IsObject({ each: true })
  @Type(() => UpdateAttendanceDto)
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  data: UpdateAttendanceDto[];
}
