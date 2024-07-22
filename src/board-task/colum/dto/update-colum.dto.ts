import {
  IsOptional,
  IsString,
  IsMongoId,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateColumDtoBody {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @IsMongoId()
  schoolId?: string;

  @IsOptional()
  @IsMongoId()
  boardId?: string;
}

export class UpdateColumDtoQuery {
  @IsNotEmpty()
  @IsMongoId()
  columId: string;
}

export class UpdateColumDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateColumDtoQuery)
  query: UpdateColumDtoQuery;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateColumDtoBody)
  body: UpdateColumDtoBody;
}
