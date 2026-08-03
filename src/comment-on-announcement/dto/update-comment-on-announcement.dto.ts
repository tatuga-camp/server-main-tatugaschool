import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateCommentOnAnnouncementQuery {
  @IsNotEmpty()
  @IsMongoId()
  commentOnAnnouncementId: string;
}

class UpdateCommentOnAnnouncementBody {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;
}

export class UpdateCommentOnAnnouncementDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateCommentOnAnnouncementQuery)
  query: UpdateCommentOnAnnouncementQuery;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateCommentOnAnnouncementBody)
  body: UpdateCommentOnAnnouncementBody;
}
