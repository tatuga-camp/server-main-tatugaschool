// src/quiz/dto/integrity-batch.dto.ts
import { QuizIntegrityEventType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { MAX_EVENTS_PER_BATCH } from '../quiz.constants';

export class IntegrityEventDto {
  @IsEnum(QuizIntegrityEventType)
  type: QuizIntegrityEventType;

  @IsDateString()
  clientAt: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number;
}

export class IntegrityBatchDto {
  @IsArray()
  @ArrayMaxSize(MAX_EVENTS_PER_BATCH)
  @ValidateNested({ each: true })
  @Type(() => IntegrityEventDto)
  events: IntegrityEventDto[];

  @IsOptional()
  @IsBoolean()
  heartbeat?: boolean;
}
