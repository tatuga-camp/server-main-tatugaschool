import { User } from '@prisma/client';
import { GetSignURLDto } from './dto';
import { GoogleStorageService } from './google-storage.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserGuard } from '../auth/guard';
import { GetUser } from '../auth/decorators';

@UseGuards(UserGuard)
@Controller('v1/google-storage')
export class GoogleStorageController {
  constructor(private googleStorageService: GoogleStorageService) {}

  @Get('get-signURL')
  UserGetSignURL(@Query() dto: GetSignURLDto, @GetUser() user: User) {
    return this.googleStorageService.GetSignURL({
      userId: user.id,
      fileName: dto.fileName,
      fileType: dto.fileType,
    });
  }
}
