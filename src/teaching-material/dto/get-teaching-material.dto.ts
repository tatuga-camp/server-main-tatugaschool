import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class GetTeachingMaterialsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  filter?: string;
}

export class GetTeachingMaterialDto {
  @IsNotEmpty()
  @IsMongoId()
  teachingMaterialId: string;
}
