export type RequestGetStudentOnSubjectBySubjectId = {
  subjectId: string;
};

export type RequestGetStudentOnSubjectByStudentId = {
  studentId: string;
};

export type RequestGetStudentOnSubjectById = {
  studentOnSubjectId: string;
};

export type RequestCreateStudentOnSubject = {
  title: string;
  firstName: string;
  lastName: string;
  picture: string;
  number: string;
  studentId: string;
  classId: string;
  subjectId: string;
  schoolId: string;
};

export type RequestUpdateStudentOnSubject = {
  query: {
    studentOnSubjectId: string;
  };
  data: {
    title?: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    number?: string;
    totalSpeicalScore?: number;
  };
};

export type RequestDeleteStudentOnSubject = {
  studentOnSubjectId: string;
};
