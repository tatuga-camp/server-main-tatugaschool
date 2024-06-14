import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Status, MemberRole } from '@prisma/client';
import { Type } from 'class-transformer';

class UpdateMemberOnSchoolQuery {
  @IsNotEmpty()
  @IsMongoId()
  memberOnSchoolId: string;
}

class UpdateMemberOnSchoolBody {
  @IsOptional()
  @IsEnum(Status)
  status: Status;

  @IsOptional()
  @IsEnum(MemberRole)
  role: MemberRole;
}

export class UpdateMemberOnSchoolDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateMemberOnSchoolQuery)
  @ValidateNested()
  query: UpdateMemberOnSchoolQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateMemberOnSchoolBody)
  @ValidateNested()
  body: UpdateMemberOnSchoolBody;
}
