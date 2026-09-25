import { PublicProgressLevel } from '@prisma/client';
import { IsEnum, IsNotEmpty, Matches } from 'class-validator';

export class PublicProgressLevelDto {
  @IsNotEmpty()
  @IsEnum(PublicProgressLevel)
  level: PublicProgressLevel;
}

export class PublicProgressTokenParamDto {
  @IsNotEmpty()
  @Matches(/^[a-f0-9]{32}$/)
  token: string;
}
