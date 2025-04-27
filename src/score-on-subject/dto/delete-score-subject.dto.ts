import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteScoreOnSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  scoreOnSubjectId: string;
}
