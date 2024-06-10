import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class GetSchoolByMemberOnSchoolDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  id: string;
}
