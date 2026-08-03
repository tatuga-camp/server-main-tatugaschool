import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetCommentOnAnnouncementByAnnouncementIdDto {
  @IsNotEmpty()
  @IsMongoId()
  announcementId: string;
}
