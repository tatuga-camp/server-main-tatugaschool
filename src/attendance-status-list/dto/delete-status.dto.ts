import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteStatusDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
