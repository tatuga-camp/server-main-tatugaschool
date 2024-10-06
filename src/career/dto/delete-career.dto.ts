import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteCareerDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
