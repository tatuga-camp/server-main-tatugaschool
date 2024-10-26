import { Type } from 'class-transformer';
import {
  IsArray,
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

class UpdateSubjectQuery {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

class UpdateSubjectBody {
  @IsOptional()
  @IsString()
  @MaxLength(999)
  title?: string;

  @IsOptional()
  @IsDateString()
  educationYear?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(999)
  description?: string;

  @IsOptional()
  @IsUrl()
  backgroundImage?: string;

  @IsOptional()
  @IsString()
  blurHash?: string;
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
  @Type(() => String)
  @IsArray()
  subjectIds: string[];

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsNotEmpty()
  @IsDateString()
  educationYear: Date;
}
