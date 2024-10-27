import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
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

  @IsOptional()
  @IsMongoId()
  billingManagerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(999)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(999)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(999)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(999)
  zipCode?: string;

  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsOptional()
  @IsPhoneNumber()
  phoneNumber?: string;
}

export class UpdateSchoolDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSchoolQuery)
  @ValidateNested()
  query: UpdateSchoolQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSchoolBody)
  @ValidateNested()
  body: UpdateSchoolBody;
}
