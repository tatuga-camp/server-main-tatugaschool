import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAllScoreOnSubjectBySujectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
