import { Type } from 'class-transformer';

import {
  IsOptional,
  IsString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  MinLength,
  IsUrl,
} from 'class-validator';

class UpdateStudentQuery {
  @IsOptional()
  @IsMongoId()
  studentId?: string;
}

class UpdateStudenBody {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsUrl()
  photo?: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class UpdateStudentDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudentQuery)
  @ValidateNested()
  query: UpdateStudentQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateStudenBody)
  @ValidateNested()
  body: UpdateStudenBody;
}
