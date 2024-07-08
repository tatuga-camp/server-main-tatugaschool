import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteScoreOnStudentDto {
  @IsNotEmpty()
  @IsMongoId()
  scoreOnStudentId: string;
}
