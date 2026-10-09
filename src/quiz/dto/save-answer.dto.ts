// src/quiz/dto/save-answer.dto.ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { QUIZ_ID_PATTERN } from '../quiz.constants';

export class QuizBlankAnswerDto {
  @IsString()
  @Matches(QUIZ_ID_PATTERN)
  blankId: string;

  @IsString()
  @MaxLength(500)
  value: string;
}

export class SaveQuizAnswerDto {
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  selectedOptionIds: string[];

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizBlankAnswerDto)
  blankAnswers: QuizBlankAnswerDto[];
}
