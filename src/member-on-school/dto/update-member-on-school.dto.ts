import { IsEnum, IsOptional } from 'class-validator';
import { Status, MemberRole } from '@prisma/client';

export class UpdateMemberOnSchoolDto {
  @IsOptional()
  @IsEnum(Status)
  readonly status: Status;

  @IsOptional()
  @IsEnum(MemberRole)
  readonly role: MemberRole;
}
