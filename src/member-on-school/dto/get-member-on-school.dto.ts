import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

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
