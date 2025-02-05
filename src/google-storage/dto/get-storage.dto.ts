import {
  IsMongoId,
  IsNotEmpty,
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

  @IsNotEmpty()
  @IsString()
  fileType: string;
}
