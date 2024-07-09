import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
  MaxLength,
  IsUrl,
} from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(299)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(699)
  description?: string;

  @IsNotEmpty()
  @IsUrl()
  icon: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
