import {
  IsString,
  IsDate,
  IsOptional,
  IsMongoId,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateClassDto {
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

  @IsOptional()
  @IsMongoId()
  classId?: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class ReorderClassDto {
  @IsArray()
  @IsNotEmpty({ each: true })
  @IsString({ each: true })
  @IsMongoId({ each: true })
  classIds: string[];
}
