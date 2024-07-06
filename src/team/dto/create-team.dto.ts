import { IsNotEmpty, IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateTeamDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  icon: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
