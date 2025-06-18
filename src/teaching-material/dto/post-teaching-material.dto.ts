import { Plan } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBase64,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

export class CreateTeachingMaterialDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  tags: string[];

  @IsNotEmpty()
  @IsEnum(Plan)
  accessLevel: Plan;
}

class GetDescriptionSuggestion {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsNotEmpty()
  @IsString()
  type: string;
}

export class GetDescriptionSuggestionDto {
  @IsNotEmpty()
  @IsArray()
  @Type(() => GetDescriptionSuggestion)
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  data: GetDescriptionSuggestion[];
}
