import { IsMongoId, IsNotEmpty } from 'class-validator';

export class MarkAsReadeNotificationDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
