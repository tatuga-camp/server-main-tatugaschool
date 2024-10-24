import { Type } from 'class-transformer';
import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class Filter {
  @IsOptional()
  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate: string;
}
export class GetAllScoreOnStudentBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsOptional()
  @IsObject()
  @Type(() => Filter)
  @ValidateNested()
  filter: Filter;
}

export class GetAllScoreOnStudentByStudentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;
}
