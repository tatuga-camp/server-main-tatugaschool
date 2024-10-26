export interface RequestCreateStudent {
  title: string;
  firstName: string;
  lastName: string;
  photo: string;
  number: string;
  classId: string;
  blurHash: string;
  schoolId: string;
}

export interface RequestGetStudent {
  studentId: string;
}

export interface RequestGetAllStudents {
  classId: string;
}

export interface RequestDeleteStudent {
  studentId: string;
}

export interface RequestUpdateStudent {
  query: {
    studentId: string;
  };
  body: {
    title?: string;
    firstName?: string;
    lastName?: string;
    photo?: string;
    blurHash?: string;
    number?: string;
    password?: string;
  };
}
