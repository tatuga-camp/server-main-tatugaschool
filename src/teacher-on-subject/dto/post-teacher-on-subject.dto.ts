import { MemberRole } from '@prisma/client';
import { IsEnum, IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateTeacherOnSubjectDto {
  @IsNotEmpty()
  @IsEnum(MemberRole)
  role: MemberRole;

  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
