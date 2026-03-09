import {
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { IsEducationYear } from '../../custom-validate';
export class CreateSubjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  title: string;

  @IsNotEmpty()
  @IsEducationYear()
  educationYear: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  description: string;

  @IsNotEmpty()
  @IsMongoId()
  classId: string;

  @IsOptional()
  @IsUrl()
  backgroundImage: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsOptional()
  @IsBoolean()
  allowStudentDeleteWork?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStudentViewOverallScore?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStudentViewGrade?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStudentViewAttendance?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStudentViewScoreOnAssignment?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStudentDoneAssignmentInOrder?: boolean;

  @IsOptional()
  @IsBoolean()
  allowHideStudentList?: boolean;
}

export class DuplicateSubjectDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  title: string;

  @IsNotEmpty()
  @IsEducationYear()
  educationYear: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  description: string;

  @IsNotEmpty()
  @IsMongoId()
  classroomId: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsOptional()
  @IsUrl()
  backgroundImage?: string;
}
