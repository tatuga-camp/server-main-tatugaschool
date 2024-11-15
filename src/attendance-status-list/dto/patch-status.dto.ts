import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsHexColor,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class updateQuery {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}

class updateBody {
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => Number(value))
  value?: number;
}

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => updateQuery)
  @ValidateNested()
  query: updateQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => updateBody)
  @ValidateNested()
  body: updateBody;
}
