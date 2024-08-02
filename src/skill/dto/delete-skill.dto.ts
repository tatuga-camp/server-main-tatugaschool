import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteSkillDto {
  @IsNotEmpty()
  @IsMongoId()
  skillId: string;
}
