import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateBoardDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsMongoId()
  teamId: string;
}
