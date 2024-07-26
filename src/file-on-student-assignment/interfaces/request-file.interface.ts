export type RequestGetFileOnStudentAssignmentById = {
  fileOnStudentAssignmentId: string;
};

export type RequestGetFileOnStudentAssignmentByStudentOnAssignmentId = {
  studentOnAssignmentId: string;
};

export type RequestCreateFileOnStudentAssignment = {
  type: string;
  url: string;
  size: number;
  subjectId: string;
  schoolId: string;
  studentOnAssignmentId: string;
  assignmentId: string;
  studentId: string;
};

export type RequestDeleteFileOnStudentAssignment = {
  fileOnStudentAssignmentId: string;
};
