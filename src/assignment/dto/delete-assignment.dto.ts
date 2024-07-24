import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
