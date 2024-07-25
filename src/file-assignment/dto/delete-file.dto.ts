import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteFileAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  fileOnAssignmentId: string;
}
