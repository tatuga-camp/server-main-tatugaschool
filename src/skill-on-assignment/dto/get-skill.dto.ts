import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetSkillOnAssignmentByAssignmentId {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
