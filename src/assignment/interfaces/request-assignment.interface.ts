import { AssignmentType } from '@prisma/client';

export type RequestGetAssignmentById = {
  assignmentId: string;
  withVector?: boolean;
};
export type RequestGetAssignmentBySubjectId = {
  subjectId: string;
};

export type RequestDeleteAssignment = {
  assignmentId: string;
};
