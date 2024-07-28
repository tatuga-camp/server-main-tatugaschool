import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteCommentAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  commentOnAssignmentId: string;
}
