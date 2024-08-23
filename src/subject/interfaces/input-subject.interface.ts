export type RequestGetSubjectById = {
  subjectId: string;
};

export type RequestCreateSubject = {
  title: string;
  educationYear: Date;
  description: string;
  backgroundImage?: string;
  order: number;
  classId: string;
  userId: string;
  schoolId: string;
};

export type RequestUpdateSubject = {
  query: {
    subjectId: string;
  };
  body: {
    title?: string;
    educationYear?: Date;
    description?: string;
    order?: number;
    backgroundImage?: string;
  };
};

export type RequestDeleteSubject = {
  subjectId: string;
};

export type RequestReorderSubjects = {
  subjectIds: string[];
};
