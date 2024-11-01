import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class SortDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  studentOnSubjectIds: string[];
}

class UpdateStudentQuery {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}

class UpdateStudentBody {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateStudentOnSubjectDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudentQuery)
  @ValidateNested()
  query: UpdateStudentQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudentBody)
  @ValidateNested()
  data: UpdateStudentBody;
}
