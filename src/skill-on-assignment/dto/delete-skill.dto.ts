import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteSkillOnAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  skillOnAssignmentId: string;
}
