export interface RequestCreateStudent {
  title: string;
  firstName: string;
  lastName: string;
  photo: string;
  number: string;
  classId: string;
  schoolId: string;
}

export interface RequestCreateManyStudents {
  data: {
    title: string;
    firstName: string;
    lastName: string;
    photo: string;
    number: string;
    classId: string;
    schoolId: string;
  }[];
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
    number?: string;
    password?: string;
  };
}
