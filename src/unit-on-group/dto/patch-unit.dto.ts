import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateUnitOnGroupQuery {
  @IsNotEmpty()
  @IsMongoId()
  unitOnGroupId: string;
}

class UpdateUnitOnGroupBody {
  @IsOptional()
  @IsString()
  @MaxLength(599)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(599)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(599)
  description?: string;
}

export class UpdateUnitOnGroupDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateUnitOnGroupQuery)
  query: UpdateUnitOnGroupQuery;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateUnitOnGroupBody)
  body: UpdateUnitOnGroupBody;
}

export class ReorderUnitOnGroupDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  unitOnGroupIds: string[];
}
