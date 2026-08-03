import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAnnouncementBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
