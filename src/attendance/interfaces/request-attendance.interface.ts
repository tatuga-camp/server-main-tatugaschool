export type RequestGetAttendanceById = {
  attendanceId: string;
};

export type RequestUpdateAttendanceById = {
  query: {
    attendanceId: string;
  };
  body: {
    status?: string;
    note?: string;
  };
};
