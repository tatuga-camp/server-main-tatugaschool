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

export type RequestUpdateStudentOnAssignment = {
  query: {
    studentOnAssignmentId: string;
  };
  body: {
    title?: string;
    firstName?: string;
    lastName?: string;
    photo?: string;
    blurHash?: string;
    number?: string;
    score?: number;
    body?: string;
    isCompleted?: boolean;
    isReviewed?: boolean;
    isAssigned?: boolean;
  };
};

export type RequestDeleteStudentOnAssignment = {
  studentOnAssignmentId: string;
};
