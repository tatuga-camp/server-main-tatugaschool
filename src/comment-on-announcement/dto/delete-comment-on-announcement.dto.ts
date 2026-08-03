import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteCommentOnAnnouncementDto {
  @IsNotEmpty()
  @IsMongoId()
  commentOnAnnouncementId: string;
}
