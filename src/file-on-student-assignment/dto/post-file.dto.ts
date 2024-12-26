import { StudentAssignmentContentType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
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
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  blurHash?: string;

  @IsNotEmpty()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(0)
  size: number;

  @IsNotEmpty()
  @IsEnum(StudentAssignmentContentType)
  contentType: StudentAssignmentContentType;

  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;
}
