import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class QueryUpdateFile {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}

class BodyUpdateFile {
  @IsNotEmpty()
  @IsString()
  body: string;

  @IsOptional()
  @IsString()
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
