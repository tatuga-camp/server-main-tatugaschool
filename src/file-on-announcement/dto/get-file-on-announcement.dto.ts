import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetFileOnAnnouncementByAnnouncementIdDto {
  @IsNotEmpty()
  @IsMongoId()
  announcementId: string;
}
