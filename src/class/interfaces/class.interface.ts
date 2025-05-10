export interface RequestCreateClass {
  title: string;
  level: string;
  description?: string;
  schoolId: string;
  userId: string;
}

export interface RequestUpdateClass {
  query: {
    classId: string;
  };
  data: {
    title?: string;
    level?: string;
    description?: string;
    schoolId?: string;
  };
}

export interface RequestGetClass {
  classId: string;
}

export interface RequestGetClassByPage {
  page: number;
  limit: number;
  schoolId: string;
}

export interface RequestDeleteClass {
  classId: string;
}
