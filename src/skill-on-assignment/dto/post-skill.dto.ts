import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateSkillOnAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  skillId: string;

  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
