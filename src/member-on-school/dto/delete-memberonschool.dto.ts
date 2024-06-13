import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class DeleteMemberOnSchoolDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  memberOnSchoolId: string;
}
