import { Student, User } from '@prisma/client';
import { Response } from 'express';
import {
  CreateFileOnStudentAssignmentDto,
  DeleteFileOnStudentAssignmentDto,
  DowloadAllFilesDto,
  GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
  UpdateFileDto,
} from './dto';
import { FileOnStudentAssignmentService } from './file-on-student-assignment.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { StudentGuard, UserGuard } from '../auth/guard';
import { GetStudent, GetUser } from '../auth/decorators';

@Controller('v1/file-on-student-assignments')
export class FileOnStudentAssignmentController {
  constructor(
    private fileOnStudentAssignmentService: FileOnStudentAssignmentService,
  ) {}

  @UseGuards(StudentGuard)
  @Get('student-on-assignment/:studentOnAssignmentId/student')
  getByStudentOnAssignmentIdFromStudnet(
    @Param() dto: GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
    @GetStudent() student: Student,
  ) {
    return this.fileOnStudentAssignmentService.getFileByStudentOnAssignmentIdFromStudent(
      dto,
      student,
    );
  }

  @UseGuards(UserGuard)
  @Get('student-on-assignment/:studentOnAssignmentId/teacher')
  getByStudentOnAssignmentIdFromTeacher(
    @Param() dto: GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
    @GetUser() user: User,
  ) {
    return this.fileOnStudentAssignmentService.getFileByStudentOnAssignmentIdFromTeacher(
      dto,
      user,
    );
  }

  @UseGuards(UserGuard)
  @Post('download-all')
  async downloadAllFiles(
    @Body() dto: DowloadAllFilesDto,
    @GetUser() user: User,
    @Res() res: Response,
  ) {
    const archive = await this.fileOnStudentAssignmentService.downloadAllFiles(
      dto,
      user,
    );
    res.attachment('assignments.zip');
    archive.pipe(res);
  }

  @UseGuards(StudentGuard)
  @Post('student')
  createFileOnStudentAssignmentFromStudent(
    @Body() dto: CreateFileOnStudentAssignmentDto,
    @GetStudent() student: Student,
  ) {
    return this.fileOnStudentAssignmentService.createFileOnStudentAssignmentFromStudent(
      dto,
      student,
    );
  }

  @UseGuards(StudentGuard)
  @Delete(':fileOnStudentAssignmentId/student')
  deleteFileOnStudentAssignmentFromStudnet(
    @Param() dto: DeleteFileOnStudentAssignmentDto,
    @GetStudent() student: Student,
  ) {
    return this.fileOnStudentAssignmentService.delete(dto, null, student);
  }

  @UseGuards(StudentGuard)
  @Patch('student')
  updateFileOnStudentAssignmentFromStudent(
    @Body() dto: UpdateFileDto,
    @GetStudent() student: Student,
  ) {
    return this.fileOnStudentAssignmentService.updateFile(dto, null, student);
  }
  @UseGuards(UserGuard)
  @Patch('teacher')
  updateFileOnStudentAssignmentFromTeachers(
    @Body() dto: UpdateFileDto,
    @GetUser() user: User,
  ) {
    return this.fileOnStudentAssignmentService.updateFile(dto, user, null);
  }

  @UseGuards(UserGuard)
  @Delete(':fileOnStudentAssignmentId/teacher')
  deleteFileOnStudentAssignmentFromTeacher(
    @Param() dto: DeleteFileOnStudentAssignmentDto,
    @GetUser() user: User,
  ) {
    return this.fileOnStudentAssignmentService.delete(dto, user);
  }
}
