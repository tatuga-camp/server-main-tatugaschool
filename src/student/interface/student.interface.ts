import { Student } from '@prisma/client';
import {
  CreateManyStudentsDto,
  CreateStudentDto,
} from '../dto/create-student.dto';

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
