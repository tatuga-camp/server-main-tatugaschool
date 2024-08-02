import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetSkillDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
