import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GetSignURLDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  fileType: string;
}
