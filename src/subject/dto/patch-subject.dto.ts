import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsEducationYear } from '../../custom-validate';

class UpdateSubjectQuery {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

class UpdateSubjectBody {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsEducationYear()
  eduYear?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsUrl()
  backgroundImage?: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

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
}

export class UpdateSubjectDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSubjectQuery)
  @ValidateNested()
  query: UpdateSubjectQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSubjectBody)
  @ValidateNested()
  body: UpdateSubjectBody;
}

export class ReorderSubjectsDto {
  @IsNotEmpty()
  @IsMongoId({ each: true })
  @IsArray()
  @ArrayMinSize(2)
  subjectIds: string[];
}
