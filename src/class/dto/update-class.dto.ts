import {
  IsString,
  IsDateString,
  IsOptional,
  IsMongoId,
  IsArray,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsEducationYear } from '../../custom-validate';

export class ReorderClassDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsMongoId({ each: true })
  @ArrayMinSize(2)
  classIds: string[];
}

class UpdateClassQuery {
  @IsNotEmpty()
  @IsMongoId()
  classId: string;
}

class UpdateClassBody {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEducationYear()
  educationYear?: string;
}

export class UpdateClassDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateClassQuery)
  @ValidateNested()
  query: UpdateClassQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateClassBody)
  @ValidateNested()
  body: UpdateClassBody;
}
