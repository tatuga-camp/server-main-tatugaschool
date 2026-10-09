import { QuizQuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { QUIZ_ID_PATTERN } from '../quiz.constants';

export class QuizOptionDto {
  @IsString()
  @Matches(QUIZ_ID_PATTERN)
  id: string;

  @IsString()
  @MaxLength(1000)
  text: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @IsBoolean()
  isCorrect: boolean;
}

export class QuizBlankDto {
  @IsString()
  @Matches(QUIZ_ID_PATTERN)
  id: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  acceptedAnswers: string[];
}

export class CreateQuizQuestionDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;

  @IsEnum(QuizQuestionType)
  type: QuizQuestionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  prompt: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @IsNumber()
  @Min(0)
  @Max(1000)
  points: number;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options: QuizOptionDto[];

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizBlankDto)
  blanks: QuizBlankDto[];
}

export class UpdateQuizQuestionDto {
  @IsOptional()
  @IsEnum(QuizQuestionType)
  type?: QuizQuestionType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  prompt?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  points?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizOptionDto)
  options?: QuizOptionDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizBlankDto)
  blanks?: QuizBlankDto[];
}

export class ReorderQuizQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({ each: true })
  ids: string[];
}

export class DuplicateQuizDto {
  @IsOptional()
  @IsMongoId()
  targetSubjectId?: string;
}
