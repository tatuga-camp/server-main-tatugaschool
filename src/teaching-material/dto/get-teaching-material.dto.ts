import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetTeachingMaterialDto {
  @IsNotEmpty()
  @IsString()
  search: string;
}
