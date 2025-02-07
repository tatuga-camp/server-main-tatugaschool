import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetSkillDto {
  @IsNotEmpty()
  @IsMongoId()
  skillId: string;
}

export class GetSkillByAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
