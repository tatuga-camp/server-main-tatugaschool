import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class DeleteClassDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  id: string;
}
