import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteMemberOnTeamDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
