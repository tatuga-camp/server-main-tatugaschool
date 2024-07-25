import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import {
  CreateFileOnAssignmentDto,
  DeleteFileAssignmentDto,
  GetFileOnAssignmentByAssignmentIdDto,
} from './dto';
import { FileAssignmentService } from './file-assignment.service';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

@Controller('v1/file-assignments')
export class FileAssignmentController {
  constructor(private fileAssignmentService: FileAssignmentService) {}

  @Get('assignment/:assignment')
  getFilesByAssignmentId(
    @Param() dto: GetFileOnAssignmentByAssignmentIdDto,
    @GetUser() user: User,
  ) {
    return this.fileAssignmentService.getFilesByAssignmentId(dto, user);
  }

  @Post()
  createFiles(@Body() dto: CreateFileOnAssignmentDto, @GetUser() user: User) {
    return this.fileAssignmentService.createFileAssignment(dto, user);
  }

  @Delete(':fileAssignmentId')
  deleteFile(@Body() dto: DeleteFileAssignmentDto, @GetUser() user: User) {
    return this.fileAssignmentService.deleteFileAssignment(dto, user);
  }
}
