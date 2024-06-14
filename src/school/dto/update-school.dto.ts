import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CreateSchoolDto } from './create-school.dto';
import { Type } from 'class-transformer';

class UpdateSchoolQuery {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

class UpdateSchoolBody {
  @IsOptional()
  @IsString()
  @MaxLength(999)
  title?: string;

  @IsOptional()
  @MaxLength(999)
  @IsString()
  description?: string;
}

export class UpdateSchoolDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSchoolQuery)
  @ValidateNested()
  query: UpdateSchoolQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSchoolQuery)
  @ValidateNested()
  body: UpdateSchoolBody;
}
