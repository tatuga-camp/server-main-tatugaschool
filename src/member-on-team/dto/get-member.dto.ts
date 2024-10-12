import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetMemberOnTeamMyTeamIdDto {
  @IsNotEmpty()
  @IsMongoId()
  teamId: string;
}
