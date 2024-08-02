export type RequestGetAssignmentById = {
  assignmentId: string;
};
export type RequestGetAssignmentBySubjectId = {
  subjectId: string;
};

export type RequestCreateAssignment = {
  title: string;
  description: string;
  maxScore: number;
  weight: number;
  beginDate: string;
  vector: number[];
  dueDate?: string;
  subjectId: string;
  schoolId: string;
  userId?: string;
};

export type RequestUpdateAssignment = {
  query: {
    assignmentId: string;
  };
  data: {
    isAllowDeleteWork?: boolean;
    title?: string;
    description?: string;
    maxScore?: number;
    weight?: number;
    vector?: number[];
    beginDate?: string;
    dueDate?: string;
  };
};

export type RequestDeleteAssignment = {
  assignmentId: string;
};
