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

class UpdateFileOnAnnouncementQuery {
  @IsNotEmpty()
  @IsMongoId()
  fileOnAnnouncementId: string;
}

class UpdateFileOnAnnouncementBody {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class UpdateFileOnAnnouncementDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateFileOnAnnouncementQuery)
  query: UpdateFileOnAnnouncementQuery;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateFileOnAnnouncementBody)
  body: UpdateFileOnAnnouncementBody;
}
