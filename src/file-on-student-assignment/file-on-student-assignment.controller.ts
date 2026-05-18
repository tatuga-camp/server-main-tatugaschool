import { Student, User } from '@prisma/client';
import { FastifyReply } from 'fastify';
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
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/file-on-student-assignments')
export class FileOnStudentAssignmentController {
  constructor(
    private fileOnStudentAssignmentService: FileOnStudentAssignmentService,
  ) {}

  @UseGuards(StudentGuard)
  @Get('student-on-assignment/:studentOnAssignmentId/student')
  getByStudentOnAssignmentIdFromStudnet(
    @Param() dto: GetFileOnStudentAssignmentByStudentOnAssignmentIdDto,
    @GetStudent() student: StudentJwtPayload,
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
    @GetUser() user: UserJwtPayload,
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
    @GetUser() user: UserJwtPayload,
    @Res() reply: FastifyReply,
  ) {
    const archive = await this.fileOnStudentAssignmentService.downloadAllFiles(
      dto,
      user,
    );
    return reply
      .header('Content-Disposition', 'attachment; filename="assignments.zip"')
      .type('application/zip')
      .send(archive);
  }

  @UseGuards(StudentGuard)
  @Post('student')
  createFileOnStudentAssignmentFromStudent(
    @Body() dto: CreateFileOnStudentAssignmentDto,
    @GetStudent() student: StudentJwtPayload,
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
    @GetStudent() student: StudentJwtPayload,
  ) {
    return this.fileOnStudentAssignmentService.delete(dto, null, student);
  }

  @UseGuards(StudentGuard)
  @Patch('student')
  updateFileOnStudentAssignmentFromStudent(
    @Body() dto: UpdateFileDto,
    @GetStudent() student: StudentJwtPayload,
  ) {
    return this.fileOnStudentAssignmentService.updateFile(dto, null, student);
  }
  @UseGuards(UserGuard)
  @Patch('teacher')
  updateFileOnStudentAssignmentFromTeachers(
    @Body() dto: UpdateFileDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.fileOnStudentAssignmentService.updateFile(dto, user, null);
  }

  @UseGuards(UserGuard)
  @Delete(':fileOnStudentAssignmentId/teacher')
  deleteFileOnStudentAssignmentFromTeacher(
    @Param() dto: DeleteFileOnStudentAssignmentDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.fileOnStudentAssignmentService.delete(dto, user);
  }
}
