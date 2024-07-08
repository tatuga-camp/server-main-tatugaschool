export type RequestGetAttendanceRows = {
  attendanceTableId: string;
};
export type RequestGetAttendanceRowById = {
  attendanceRowId: string;
};

export type RequestCreateAttendanceRow = {
  startDate: Date;
  endDate: Date;
  note?: string;
  attendanceTableId: string;
  subjectId: string;
  schoolId: string;
};

export type RequestUpdateAttendanceRow = {
  query: {
    attendanceRowId: string;
  };
  body: {
    startDate?: Date;
    endDate?: Date;
    note?: string;
  };
};

export type RequestDeleteAttendanceRow = {
  attendanceRowId: string;
};
