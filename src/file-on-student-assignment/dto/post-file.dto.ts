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

export class CreateFileOnStudentAssignmentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  type: string;

  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  size: number;

  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;
}
