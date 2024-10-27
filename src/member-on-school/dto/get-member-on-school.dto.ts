import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsEmail,
  IsOptional,
} from 'class-validator';

export class GetMemberOnSchoolByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  memberOnSchoolId: string;
}

export class GetMemberOnSchoolsDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class QueryMemberOnSchoolDto {
  @IsOptional()
  @IsEmail()
  email: string;
}
