import {
  IsString,
  IsEnum,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';
import { Status, MemberRole } from '@prisma/client';

export class CreateMemberOnSchoolDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsEnum(MemberRole)
  role: MemberRole;

  @IsString()
  @IsMongoId()
  schoolId: string;
}
