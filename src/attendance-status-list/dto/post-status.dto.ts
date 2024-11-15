import { Transform } from 'class-transformer';
import {
  IsHexColor,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStatusAttendanceDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(40)
  title: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  value: number;

  @IsNotEmpty()
  @IsHexColor()
  color: string;

  @IsNotEmpty()
  @IsMongoId()
  attendanceTableId: string;
}
