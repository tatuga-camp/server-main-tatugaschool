import {
  IsString,
  IsDate,
  IsOptional,
  IsMongoId,
  IsArray,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderClassDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @IsMongoId({ each: true })
  classIds: string[];

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
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
  @IsDate()
  @Type(() => Date)
  educationYear?: Date;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class UpdateClassDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateClassQuery)
  @ValidateNested()
  query: UpdateClassQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateClassQuery)
  @ValidateNested()
  body: UpdateClassBody;
}
