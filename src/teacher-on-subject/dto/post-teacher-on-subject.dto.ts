import { MemberRole } from '@prisma/client';
import { IsEmail, IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateTeacherOnSubjectDto {
  @IsNotEmpty()
  @IsEnum(MemberRole)
  role: MemberRole;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
