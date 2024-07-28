import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetCommentAssignmentByStudentOnAssignmentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;
}
