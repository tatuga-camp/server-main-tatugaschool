import { IsMongoId, IsNotEmpty, IsString, Matches } from 'class-validator';

// educationYear is "semester/year", e.g. "1/2567".
const EDUCATION_YEAR_REGEX = /^\d+\/\d+$/;

export class GetAnalyticsParamDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class GetAnalyticsQueryDto {
  @IsNotEmpty()
  @IsString()
  @Matches(EDUCATION_YEAR_REGEX, {
    message: 'educationYear must be in "semester/year" format, e.g. 1/2567',
  })
  educationYear: string;
}

export class GetStudentDetailParamDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}
