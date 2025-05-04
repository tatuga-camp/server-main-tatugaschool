import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateUnitOnGroupDto {
  @IsNotEmpty()
  @IsMongoId()
  groupOnSubjectId: string;

  @IsOptional()
  @IsString()
  @MaxLength(599)
  icon?: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(599)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(599)
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  order: number;
}
