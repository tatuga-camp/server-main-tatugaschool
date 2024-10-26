export type RequestGetFilesByAssignmentId = {
  assignmentId: string;
};
export type RequestGetFileById = {
  fileOnAssignmentId: string;
};

export type RequestCreateFileAssignment = {
  type: string;
  url: string;
  size: number;
  blurHash?: string;
  subjectId: string;
  schoolId: string;
  assignmentId: string;
};

export type RequestDeleteFileAssignment = {
  fileOnAssignmentId: string;
};
