import { IsString, IsEnum, IsOptional, IsMongoId } from 'class-validator';
import { Status, MemberRole } from '@prisma/client';

export class UpdateMemberOnSchoolDto {
  @IsOptional()
  @IsEnum(Status)
  readonly status?: Status;

  @IsOptional()
  @IsEnum(MemberRole)
  readonly role?: MemberRole;

  @IsString()
  readonly firstName: string;

  @IsString()
  readonly lastName: string;

  @IsString()
  readonly email: string;

  @IsString()
  readonly photo: string;

  @IsString()
  readonly phone: string;

  @IsString()
  @IsOptional()
  readonly userId?: string;

  @IsString()
  @IsMongoId()
  readonly schoolId: string;
}
