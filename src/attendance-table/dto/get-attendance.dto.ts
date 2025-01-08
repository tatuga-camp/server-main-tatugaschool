import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAttendanceTablesDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
export class GetAttendanceTableBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}
export class GetAttendanceTableById {
  @IsNotEmpty()
  @IsMongoId()
  attendanceTableId: string;
}
