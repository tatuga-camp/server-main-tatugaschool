import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteFileOnAnnouncementDto {
  @IsNotEmpty()
  @IsMongoId()
  fileOnAnnouncementId: string;
}
