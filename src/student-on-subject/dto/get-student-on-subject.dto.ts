import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetStudentOnSubjectsBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetStudentOnSubjectsByStudentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}

export class GetStudentOnSubjectByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;
}
