export type RequestGetStudentOnAssignmentById = {
  studentOnAssignmentId: string;
};

export type RequestGetStudentOnAssignmentByStudentId = {
  studentId: string;
};

export type RequestGetStudentOnAssignmentByAssignmentId = {
  assignmentId: string;
};

export type RequestCreateStudentOnAssignment = {
  title: string;
  firstName: string;
  lastName: string;
  picture: string;
  number: string;
  score?: number;
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
    picture?: string;
    number?: string;
    score?: number;
    body?: string;
    isCompleted?: boolean;
    isReviewed?: boolean;
  };
};

export type RequestDeleteStudentOnAssignment = {
  studentOnAssignmentId: string;
};
