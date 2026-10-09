import { QuizScoringMode } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class QuizSettingsDto {
  @IsOptional()
  @IsEnum(QuizScoringMode)
  scoringMode?: QuizScoringMode;

  @IsOptional()
  @ValidateIf((o) => o.timeLimitMinutes !== null)
  @IsInt()
  @Min(1)
  @Max(600)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  testMode?: boolean;

  @IsOptional()
  @IsBoolean()
  showAnswersAfterSubmit?: boolean;
}
