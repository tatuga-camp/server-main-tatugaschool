import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteAnnouncementDto {
  @IsNotEmpty()
  @IsMongoId()
  announcementId: string;
}
