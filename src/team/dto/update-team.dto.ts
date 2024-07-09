import { Type } from 'class-transformer';
import {
  IsOptional,
  ValidateNested,
  IsString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  MaxLength,
  IsUrl,
} from 'class-validator';
export class UpdateTeamQuery {
  @IsOptional()
  @IsString()
  teamId?: string;
}
export class UpdateTeamBody {
  @IsOptional()
  @IsString()
  @MaxLength(299)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(699)
  description?: string;

  @IsOptional()
  @IsUrl()
  icon?: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}

export class UpdateTeamDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateTeamQuery)
  @ValidateNested()
  query: UpdateTeamQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateTeamBody)
  @ValidateNested()
  body: UpdateTeamBody;
}
