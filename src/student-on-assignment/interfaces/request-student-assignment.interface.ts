export type RequestGetStudentOnAssignmentById = {
  studentOnAssignmentId: string;
};

export type RequestGetStudentOnAssignmentByStudentId = {
  studentId: string;
};

export type RequestGetStudentOnAssignmentByAssignmentId = {
  assignmentId: string;
};
export type RequestGetStudentOnAssignmentByStudentIdAndAssignmentId = {
  studentId: string;
  assignmentId: string;
};
export type RequestCreateStudentOnAssignment = {
  title: string;
  firstName: string;
  lastName: string;
  photo: string;
  number: string;
  score?: number;
  blurHash: string;
  body?: string;
  isCompleted?: boolean;
  isReviewed?: boolean;
  studentId: string;
  assignmentId: string;
  studentOnSubjectId: string;
  schoolId: string;
  subjectId: string;
};

export type RequestDeleteStudentOnAssignment = {
  studentOnAssignmentId: string;
};
