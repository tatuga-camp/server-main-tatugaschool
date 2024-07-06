import { Type } from 'class-transformer';
import {
  IsOptional,
  ValidateNested,
  IsString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
export class UpdateTeamQuery {
  @IsOptional()
  @IsString()
  teamId?: string;
}
export class UpdateTeamBody {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
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
