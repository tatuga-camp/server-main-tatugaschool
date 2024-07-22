import { IsNotEmpty, IsMongoId } from 'class-validator';

export class DeleteColumDto {
  @IsNotEmpty()
  @IsMongoId()
  columId: string;
}
