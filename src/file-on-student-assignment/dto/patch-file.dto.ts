import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class QueryUpdateFile {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}

class BodyUpdateFile {
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class UpdateFileDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => QueryUpdateFile)
  @ValidateNested()
  query: QueryUpdateFile;

  @IsNotEmpty()
  @IsObject()
  @Type(() => BodyUpdateFile)
  @ValidateNested()
  body: BodyUpdateFile;
}
