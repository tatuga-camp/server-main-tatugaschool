export type RequestGetAttendanceTables = {
  subjectId: string;
};

export type RequestGetAttendanceTableById = {
  attendanceTableId: string;
};

export type RequestCreateAttendanceTable = {
  title: string;
  description?: string;
  subjectId: string;
  teamId: string;
  schoolId: string;
};

export type RequestUpdateAttendanceTable = {
  query: {
    attendanceTableId: string;
  };
  body: {
    title?: string;
    description?: string;
  };
};

export type RequestDeleteAttendanceTable = {
  attendanceTableId: string;
};
