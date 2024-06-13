export type RequestGetAttendanceById = {
  attendanceId: string;
};

export type RequestUpdateAttendanceById = {
  query: {
    attendanceId: string;
  };
  body: {
    absent?: boolean;
    present?: boolean;
    holiday?: boolean;
    sick?: boolean;
    late?: boolean;
    note?: string;
  };
};
