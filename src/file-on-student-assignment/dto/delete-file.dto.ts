import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteFileOnStudentAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  fileOnStudentAssignmentId: string;
}
