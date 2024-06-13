import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class GetMemberOnSchoolDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  memberOnSchoolId: string;
}

export class GetSchoolByMemberOnSchoolDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  memberOnSchoolId: string;
}
