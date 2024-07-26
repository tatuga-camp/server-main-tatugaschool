import { Student } from '@prisma/client';
import {
  CreateFileOnStudentAssignmentDto,
  DeleteFileOnStudentAssignmentDto,
  GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
} from './dto';
import { FileOnStudentAssignmentService } from './file-on-student-assignment.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StudentGuard, UserGuard } from '../auth/guard';
import { GetStudnet } from '../auth/decorators';

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

  @UseGuards(StudentGuard)
  @Post()
  createFileOnStudentAssignment(
    @Body() dto: CreateFileOnStudentAssignmentDto,
    @GetStudnet() student: Student,
  ) {
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
