import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import {
  CreateFileOnAssignmentDto,
  DeleteFileAssignmentDto,
  GetFileOnAssignmentByAssignmentIdDto,
  UpdateFileDto,
} from './dto';
import { FileAssignmentService } from './file-assignment.service';
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
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/file-assignments')
export class FileAssignmentController {
  constructor(private fileAssignmentService: FileAssignmentService) {}

  @Get('assignment/:assignmentId')
  getByAssignmentId(
    @Param() dto: GetFileOnAssignmentByAssignmentIdDto,
    @GetUser() user: User,
  ) {
    return this.fileAssignmentService.getFilesByAssignmentId(dto, user);
  }

  @Post()
  create(@Body() dto: CreateFileOnAssignmentDto, @GetUser() user: User) {
    return this.fileAssignmentService.createFileAssignment(dto, user);
  }

  @Delete(':fileOnAssignmentId')
  delete(@Param() dto: DeleteFileAssignmentDto, @GetUser() user: User) {
    return this.fileAssignmentService.deleteFileAssignment(dto, user);
  }

  @Patch()
  update(@Body() dto: UpdateFileDto, @GetUser() user: User) {
    return this.fileAssignmentService.updateFile(dto, user);
  }
}
