import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetByCarrerIdDto {
  @IsNotEmpty()
  @IsMongoId()
  careerId: string;
}
