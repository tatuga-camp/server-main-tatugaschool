import { MemberRole, Status } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class UpdateTeacherOnSubjectQuery {
  @IsNotEmpty()
  @IsMongoId()
  teacherOnSubjectId: string;
}

class UpdateTeacherOnSubjectBody {
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;
}

export class UpdateTeacherOnSubjectDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateTeacherOnSubjectQuery)
  @ValidateNested()
  query: UpdateTeacherOnSubjectQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateTeacherOnSubjectBody)
  @ValidateNested()
  body: UpdateTeacherOnSubjectBody;
}
