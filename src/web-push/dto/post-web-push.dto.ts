import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class SubscribeNotificationDto {
  @IsNotEmpty()
  @IsObject()
  payload: any;

  @IsNotEmpty()
  @IsString()
  userAgent: string;
}
