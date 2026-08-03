import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentOnAnnouncementDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsNotEmpty()
  @IsMongoId()
  announcementId: string;
}
