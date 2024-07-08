import { Transform } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateScoreOnStudentDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  scoreOnSubjectId: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  score: number;
}
