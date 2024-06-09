import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class GetMemberOnSchoolDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  id: string;
}
