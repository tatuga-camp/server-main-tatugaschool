import { MemberRole, Status } from '@prisma/client';

export type RequestGetTeacherOnSubjectById = {
  teacherOnSubjectId: string;
};

export type RequestGetTeacherOnSubjectsBySubjectId = {
  subjectId: string;
};

export type RequestGetTeacherOnSubjectByTeacherIdAndSubjectId = {
  teacherId: string;
  subjectId: string;
};

export type RequestGetTeacherOnSubjectsByTeacherId = {
  teacherId: string;
};

export type RequestCreateTeacherOnSubject = {
  status: Status;
  role: MemberRole;
  firstName: string;
  lastName: string;
  email: string;
  photo: string;
  phone: string;
  blurHash: string;
  userId: string;
  subjectId: string;
  schoolId: string;
};

export type RequestUpdateTeacherOnSubject = {
  query: {
    teacherOnSubjectId: string;
  };
  body: {
    status?: Status;
    role?: MemberRole;
    firstName?: string;
    lastName?: string;
    email?: string;
    photo?: string;
    blurHash?: string;
    phone?: string;
  };
};

export type RequestDeleteTeacherOnSubject = {
  teacherOnSubjectId: string;
};
