import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteSkillOnCareerDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
