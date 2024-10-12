import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
  IsHexColor,
} from 'class-validator';

export class CreateColumDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsHexColor()
  color: string;

  @IsNotEmpty()
  @IsMongoId()
  boardId: string;
}
