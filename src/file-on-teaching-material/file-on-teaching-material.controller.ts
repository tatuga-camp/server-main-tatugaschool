import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import {
  CreateFileOnTeachingMaterialDto,
  DeleteFileOnTeachingMaterialDto,
} from './dto';
import { FileOnTeachingMaterialService } from './file-on-teaching-material.service';
import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserGuard } from '../auth/guard';

@Controller('v1/file-on-teaching-materials')
export class FileOnTeachingMaterialController {
  constructor(
    private fileOnTeachingMaterialService: FileOnTeachingMaterialService,
  ) {}

  @UseGuards(UserGuard)
  @Post()
  CreateFile(
    @Body() dto: CreateFileOnTeachingMaterialDto,
    @GetUser() user: User,
  ) {
    return this.fileOnTeachingMaterialService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':fileOnTeachingMaterialId')
  DeleteFile(
    @Param() dto: DeleteFileOnTeachingMaterialDto,
    @GetUser() user: User,
  ) {
    return this.fileOnTeachingMaterialService.delete(dto, user);
  }
}
