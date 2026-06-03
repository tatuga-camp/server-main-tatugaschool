import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateFileDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;

  @IsOptional()
  @IsBoolean()
  preventFastForward?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
