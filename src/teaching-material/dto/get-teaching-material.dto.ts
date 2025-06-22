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
  @IsNotEmpty()
  @IsString()
  search: string;
}

export class GetTeachingMaterialDto {
  @IsNotEmpty()
  @IsMongoId()
  teachingMaterialId: string;
}
