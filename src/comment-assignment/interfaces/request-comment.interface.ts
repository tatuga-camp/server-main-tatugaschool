import { MemberRole, Status } from '@prisma/client';

export type RequestGetCommentAssignmentById = {
  commentOnAssignmentId: string;
};

export type RequestGetCommentByStudentOnAssignmentId = {
  studentOnAssignmentId: string;
};

export type RequestCreateCommentAssignment = {
  content: string;
  title: string;
  firstName: string;
  lastName: string;
  picture?: string;
  number?: string;
  status?: Status;
  role?: MemberRole;
  email?: string;
  phone?: string;
  subjectId: string;
  userId?: string;
  teacherOnSubjectId?: string;
  schoolId: string;
  studentId?: string;
  studentOnAssignmentId: string;
};

export type RequestUpdateCommentAssignment = {
  query: {
    commentOnAssignmentId: string;
  };
  body: {
    content?: string;
    title?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    number?: string;
    status?: Status;
    role?: MemberRole;
    email?: string;
    phone?: string;
  };
};

export type RequestDeleteCommentAssignment = {
  commentOnAssignmentId: string;
};
