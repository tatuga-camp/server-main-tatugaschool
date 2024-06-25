import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';
import { IsArray } from 'class-validator';

export class CreateStudentDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  picture: string;

  @IsNotEmpty()
  @IsString()
  number: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class CreateManyStudentsDto {
  @IsArray()
  students: CreateStudentDto[];
}
