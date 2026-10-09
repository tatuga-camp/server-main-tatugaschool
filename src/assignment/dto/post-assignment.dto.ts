import { AssignmentStatus, AssignmentType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { normalizeTags } from '../utils/normalize-tags';
import { QuizSettingsDto } from '../../quiz/dto/quiz-settings.dto';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAssignmentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(999)
  title: string;

  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  maxScore?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  weight?: number;

  @IsNotEmpty()
  @IsDateString()
  beginDate: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsEnum(AssignmentType)
  type: AssignmentType;

  @IsNotEmpty()
  @IsEnum(AssignmentStatus)
  status: AssignmentStatus;

  @IsOptional()
  @IsUrl()
  videoURL?: string;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  @IsBoolean()
  preventFastForward?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStudentViewScore?: boolean;

  @IsOptional()
  @IsBoolean()
  assignAll?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  @Transform(({ value }) => normalizeTags(value))
  tags?: string[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => QuizSettingsDto)
  quizSettings?: QuizSettingsDto;
}
