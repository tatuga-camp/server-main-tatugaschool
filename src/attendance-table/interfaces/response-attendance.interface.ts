import {
  Attendance,
  AttendanceRow,
  AttendanceTable,
  StudentOnSubject,
} from '@prisma/client';

export type ResponseGetAttendanceTableById = AttendanceTable & {
  rows: (AttendanceRow & { attendances: Attendance[] })[];
  students: StudentOnSubject[];
};
