import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFileOnAssignmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  type?: string;

  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => Number(value))
  size: number;

  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
