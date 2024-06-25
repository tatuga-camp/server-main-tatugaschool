import {
  CreateManyStudentsDto,
  CreateStudentDto,
} from '../dto/create-student.dto';

import { UpdateStudentDto } from '../dto/update-student.dto';

export interface RequestCreateStudent {
  data: CreateStudentDto;
}

export interface RequestCreateManyStudents {
  data: CreateManyStudentsDto;
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
  studentId: string;
  data: UpdateStudentDto;
}
