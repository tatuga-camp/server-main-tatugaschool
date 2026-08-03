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

class UpdateAnnouncementQuery {
  @IsNotEmpty()
  @IsMongoId()
  announcementId: string;
}

class UpdateAnnouncementBody {
  @IsOptional()
  @IsString()
  @MaxLength(999)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateAnnouncementDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateAnnouncementQuery)
  query: UpdateAnnouncementQuery;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateAnnouncementBody)
  body: UpdateAnnouncementBody;
}
