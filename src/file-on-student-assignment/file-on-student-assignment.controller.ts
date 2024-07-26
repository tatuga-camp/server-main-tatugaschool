import {
  CreateFileOnStudentAssignmentDto,
  DeleteFileOnStudentAssignmentDto,
  GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
} from './dto';
import { FileOnStudentAssignmentService } from './file-on-student-assignment.service';
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

@Controller('v1/file-on-student-assignments')
export class FileOnStudentAssignmentController {
  constructor(
    private fileOnStudentAssignmentService: FileOnStudentAssignmentService,
  ) {}

  @Get('student-on-assignment/:studentOnAssignmentId')
  getByStudentOnAssignmentId(
    @Param() dto: GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
  ) {
    return this.fileOnStudentAssignmentService.getFileByStudentOnAssignmentId(
      dto,
    );
  }

  @Post()
  createFileOnStudentAssignment(@Body() dto: CreateFileOnStudentAssignmentDto) {
    return this.fileOnStudentAssignmentService.createFileOnStudentAssignment(
      dto,
    );
  }

  @Delete(':fileOnStudentAssignmentId')
  deleteFileOnStudentAssignment(
    @Param() dto: DeleteFileOnStudentAssignmentDto,
  ) {
    return this.fileOnStudentAssignmentService.deleteFileOnStudentAssignment(
      dto,
    );
  }
}
