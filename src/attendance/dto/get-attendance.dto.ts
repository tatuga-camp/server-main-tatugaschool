import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAttendanceByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceId: string;
}
