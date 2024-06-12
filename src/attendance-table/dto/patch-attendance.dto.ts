import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class UpdateAttendanceTableQuery {
  @IsNotEmpty()
  @IsMongoId()
  attendanceTableId: string;
}

class UpdateAttencanceTableBody {
  @IsOptional()
  @IsString()
  @MaxLength(599)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(999)
  description?: string;
}

export class UpdateAttendanceTableDto {
  @IsObject()
  @IsNotEmpty()
  @Type(() => UpdateAttendanceTableQuery)
  @ValidateNested()
  query: UpdateAttendanceTableQuery;

  @IsObject()
  @IsNotEmpty()
  @Type(() => UpdateAttencanceTableBody)
  @ValidateNested()
  body: UpdateAttencanceTableBody;
}
