import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetStudentOnSubjectsBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetStudentOnSubjectsByStudentIdParamsDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}

export class GetStudentOnSubjectsByStudentIdQueryDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class GetStudentOnSubjectsByStudentIdDto {
  params: GetStudentOnSubjectsByStudentIdParamsDto;
  query: GetStudentOnSubjectsByStudentIdQueryDto;
}

export class GetStudentOnSubjectByIdDto {
  params: GetStudentOnSubjectByIdParamDto;
  query: GetStudentOnSubjectByIdQueryDto;
}

export class GetStudentOnSubjectByIdParamDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;
}

export class GetStudentOnSubjectByIdQueryDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
