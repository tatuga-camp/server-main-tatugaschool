import { IsNumber, Min } from 'class-validator';

export class OverrideQuizScoreDto {
  @IsNumber()
  @Min(0)
  score: number;
}
