import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class ReorderStudentOnGroupDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  studentOnGroupIds: string[];
}

class UpdateStudentOnGroupQuery {
  @IsNotEmpty()
  @IsMongoId()
  studentOnGroupId: string;
}

class UpdateStudentOnGroupBody {
  @IsNotEmpty()
  @IsMongoId()
  unitOnGroupId: string;

  @IsOptional()
  @IsNumber()
  order: number;
}

export class UpdateStudentOnGroupDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudentOnGroupQuery)
  @ValidateNested()
  query: UpdateStudentOnGroupQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudentOnGroupBody)
  @ValidateNested()
  body: UpdateStudentOnGroupBody;
}
