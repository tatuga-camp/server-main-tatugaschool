import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteFileOnTeachingMaterialDto {
  @IsNotEmpty()
  @IsMongoId()
  fileOnTeachingMaterialId: string;
}
