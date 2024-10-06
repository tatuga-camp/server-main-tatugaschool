import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateCareerQuery {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}

class UpdateCareerBody {
  @IsOptional()
  @IsString()
  @MaxLength(9999)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9999)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(9999)
  keywords?: string;
}

export class UpdateCareerDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateCareerQuery)
  @ValidateNested()
  query: UpdateCareerQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateCareerBody)
  @ValidateNested()
  body: UpdateCareerBody;
}
