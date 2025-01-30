import {
  Attendance,
  AttendanceRow,
  AttendanceTable,
  StudentOnSubject,
} from '@prisma/client';
import { IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAttendanceByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  attendanceId: string;
}

export class GetAttendanceExportExcelDto {
  @IsNotEmpty()
  subjectId: string;
}
