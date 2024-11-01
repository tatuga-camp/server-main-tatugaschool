export type RequestGetSubjectById = {
  subjectId: string;
};

export type RequestCreateSubject = {
  title: string;
  educationYear: string;
  description: string;
  backgroundImage?: string;
  blurHash?: string;
  order: number;
  classId: string;
  userId: string;
  code:string
  schoolId: string;
};

export type RequestUpdateSubject = {
  query: {
    subjectId: string;
  };
  body: {
    title?: string;
    educationYear?: string;
    description?: string;
    order?: number;
    blurHash?: string;
    backgroundImage?: string;
  };
};

export type RequestDeleteSubject = {
  subjectId: string;
};

export type RequestReorderSubjects = {
  subjectIds: string[];
};
