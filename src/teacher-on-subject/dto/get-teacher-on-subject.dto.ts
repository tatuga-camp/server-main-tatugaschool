import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetTeacherOnSubjectByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  teacherOnSubjectId: string;
}

export class GetTeacherOnSubjectsBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetTeacherOnSubjectsByTeacherIdDto {
  @IsNotEmpty()
  @IsMongoId()
  teacherId: string;
}
