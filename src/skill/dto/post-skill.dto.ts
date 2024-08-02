import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UpdateSkillQUery {
  @IsNotEmpty()
  @IsMongoId()
  skillId: string;
}

class UpdateSkillBody {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  keywords?: string;
}

export class UpdateSkillDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSkillQUery)
  @ValidateNested()
  query: UpdateSkillQUery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateSkillBody)
  @ValidateNested()
  data: UpdateSkillBody;
}
