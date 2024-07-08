import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAllScoreOnStudentBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetAllScoreOnStudentByStudentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;
}
