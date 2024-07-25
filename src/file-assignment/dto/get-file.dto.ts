import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetFileOnAssignmentByAssignmentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
