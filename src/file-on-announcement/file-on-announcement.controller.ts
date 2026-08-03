import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { FileOnAnnouncementService } from './file-on-announcement.service';
import {
  CreateFileOnAnnouncementDto,
  DeleteFileOnAnnouncementDto,
  GetFileOnAnnouncementByAnnouncementIdDto,
  UpdateFileOnAnnouncementDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@UseGuards(UserGuard)
@Controller('v1/file-on-announcements')
export class FileOnAnnouncementController {
  constructor(
    private fileOnAnnouncementService: FileOnAnnouncementService,
  ) {}

  @Get('announcement/:announcementId')
  getByAnnouncementId(
    @Param() dto: GetFileOnAnnouncementByAnnouncementIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.fileOnAnnouncementService.getByAnnouncementId(dto, user);
  }

  @Post()
  create(
    @GetUser() user: UserJwtPayload,
    @Body() dto: CreateFileOnAnnouncementDto,
  ) {
    return this.fileOnAnnouncementService.create(dto, user);
  }

  @Patch()
  update(
    @GetUser() user: UserJwtPayload,
    @Body() dto: UpdateFileOnAnnouncementDto,
  ) {
    return this.fileOnAnnouncementService.update(dto, user);
  }

  @Delete(':fileOnAnnouncementId')
  delete(
    @GetUser() user: UserJwtPayload,
    @Param() dto: DeleteFileOnAnnouncementDto,
  ) {
    return this.fileOnAnnouncementService.delete(dto, user);
  }
}
