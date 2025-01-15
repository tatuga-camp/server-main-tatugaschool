import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsUrl,
} from 'class-validator';
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

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsOptional()
  @IsUrl()
  photo?: string | undefined;

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
