import { IsIn, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export const ALLOWED_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🎉'];

export class ToggleReactionDto {
  @IsNotEmpty()
  @IsMongoId()
  announcementId: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(ALLOWED_REACTION_EMOJIS)
  emoji: string;
}
