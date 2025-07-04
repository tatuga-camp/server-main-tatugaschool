import { Plan } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

class UpdateTeachingMaterialQuery {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}

class UpdateTeachingMaterialBody {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  tags?: string[];

  @IsOptional()
  @IsEnum(Plan)
  accessLevel?: Plan;

  @IsOptional()
  @IsUrl()
  creatorURL?: string;
}

export class UpdateTeachingMaterialDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateTeachingMaterialQuery)
  @ValidateNested()
  query: UpdateTeachingMaterialQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateTeachingMaterialBody)
  @ValidateNested()
  body: UpdateTeachingMaterialBody;
}

export class GernearteThumnailDto {
  @IsNotEmpty()
  @IsMongoId()
  teachingMaterialId: string;
}
