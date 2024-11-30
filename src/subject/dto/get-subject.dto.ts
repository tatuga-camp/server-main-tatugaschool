import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsEducationYear } from '../../custom-validate';
export class GetSubjectByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetSubjectByPageDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  page: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  limit: number;

  @IsOptional()
  @IsString()
  @MaxLength(199)
  search: string;

  @IsNotEmpty()
  @IsEducationYear()
  eduYear: string;
}

export class getAllSubjectsByTeamIdParam {
  @IsNotEmpty()
  @IsMongoId()
  teamId: string;
}

export class getAllSubjectsByTeamIdQuery {
  @IsNotEmpty()
  @IsEducationYear()
  educationYear: string;
}

export class GetSubjectByCode {
  @IsNotEmpty()
  @MaxLength(6)
  @MinLength(6)
  code: string;
}

export class PararmSubjectThatStudentBelongto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}

export class QuerySubjectThatStudentBelongto {
  @IsNotEmpty()
  @IsEducationYear()
  eduYear: string;
}
