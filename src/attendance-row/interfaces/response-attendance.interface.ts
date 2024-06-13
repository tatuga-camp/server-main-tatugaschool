import { Attendance, AttendanceRow } from '@prisma/client';

export type ResponseGetAttendanceRowById = AttendanceRow & {
  attendances: Attendance[];
};
