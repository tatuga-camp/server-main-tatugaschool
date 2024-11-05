import { IsNotEmpty, IsString, IsMongoId, IsOptional } from 'class-validator';
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
  photo: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsNotEmpty()
  @IsString()
  number: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;
}

export class CreateManyStudentsDto {
  @IsArray()
  students: CreateStudentDto[];
}
