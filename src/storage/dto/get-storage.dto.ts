import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GetSignURLDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsOptional()
  @IsMongoId()
  schoolId?: string;

  @IsOptional()
  @IsString()
  fileType?: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  fileSize: number;
}
