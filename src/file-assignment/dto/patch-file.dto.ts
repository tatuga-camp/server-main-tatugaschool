import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateFileDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;

  @IsOptional()
  @IsBoolean()
  preventFastForward?: boolean;
}
