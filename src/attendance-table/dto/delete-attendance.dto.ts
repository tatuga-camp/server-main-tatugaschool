import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteAttendanceTableDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceTableId: string;
}
