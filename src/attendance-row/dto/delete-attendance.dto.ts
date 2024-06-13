import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteAttendanceRowDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceRowId: string;
}
