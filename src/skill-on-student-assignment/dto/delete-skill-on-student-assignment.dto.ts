import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
