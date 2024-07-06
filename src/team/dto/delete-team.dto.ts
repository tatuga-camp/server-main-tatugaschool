import { IsNotEmpty, IsMongoId } from 'class-validator';

export class DeleteTeamDto {
  @IsNotEmpty()
  @IsMongoId()
  teamId: string;
}
