import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateColumDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNotEmpty()
  @IsMongoId()
  teamId: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsNotEmpty()
  @IsMongoId()
  boardId: string;
}
