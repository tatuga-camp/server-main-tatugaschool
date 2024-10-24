import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class GetAllScoreOnSubjectBySujectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
