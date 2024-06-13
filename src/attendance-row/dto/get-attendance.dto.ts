import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAttendanceRowsDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceTableId: string;
}

export class GetAttendanceRowByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceRowId: string;
}
