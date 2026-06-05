import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class GradeRubricItemDto {
  @IsMongoId() criterionId: string;
  @IsMongoId() selectedLevelId: string;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

export class GradeRubricDto {
  @IsMongoId() studentOnAssignmentId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GradeRubricItemDto)
  items: GradeRubricItemDto[];
}
