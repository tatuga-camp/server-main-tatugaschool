import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class UpdateBoardDtoBody {
  @IsOptional()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  teamId: string;

  @IsOptional()
  @IsString()
  schoolId: string;
}

export class UpdateBoardDtoQuery {
  @IsNotEmpty()
  @IsMongoId()
  boardId: string;
}

export class UpdateBoardDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateBoardDtoQuery)
  @ValidateNested()
  query: UpdateBoardDtoQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateBoardDtoBody)
  @ValidateNested()
  body: UpdateBoardDtoBody;
}
