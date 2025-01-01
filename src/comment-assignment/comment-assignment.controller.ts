import { CommentAssignmentService } from './comment-assignment.service';
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
import {
  CreateCommentOnAssignmentDto,
  DeleteCommentAssignmentDto,
  GetCommentAssignmentByStudentOnAssignmentIdDto,
  UpdateCommentOnAssignmentDto,
} from './dto';
import { GetStudent, GetUser } from '../auth/decorators';
import { Student, User } from '@prisma/client';
import { StudentGuard, UserGuard } from '../auth/guard';

@Controller('v1/comment-assignments')
export class CommentAssignmentController {
  constructor(private commentAssignmentService: CommentAssignmentService) {}

  @UseGuards(StudentGuard)
  @Get('studentOnAssignmentId/:studentOnAssignmentId/student')
  getByStudentOnAssignmentIdFromStudent(
    @Param() dto: GetCommentAssignmentByStudentOnAssignmentIdDto,
    @GetStudent() student: Student,
  ) {
    return this.commentAssignmentService.getByStudentOnAssignment(
      dto,
      null,
      student,
    );
  }

  @UseGuards(UserGuard)
  @Get('studentOnAssignmentId/:studentOnAssignmentId/teacher')
  getByStudentOnAssignmentIdFromTeacher(
    @Param() dto: GetCommentAssignmentByStudentOnAssignmentIdDto,
    @GetUser() user: User,
  ) {
    return this.commentAssignmentService.getByStudentOnAssignment(
      dto,
      user,
      null,
    );
  }

  @UseGuards(StudentGuard)
  @Post('student')
  createCommentOnAssignmentFromStudent(
    @GetStudent() student: Student,
    @Body() dto: CreateCommentOnAssignmentDto,
  ) {
    return this.commentAssignmentService.createFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Post('teacher')
  createCommentOnAssignmentFromTeacher(
    @GetUser() user: User,
    @Body() dto: CreateCommentOnAssignmentDto,
  ) {
    return this.commentAssignmentService.createFromTeacher(dto, user);
  }

  @UseGuards(StudentGuard)
  @Patch('student')
  updateCommentOnAssignmentFromStudent(
    @GetStudent() student: Student,
    @Body() dto: UpdateCommentOnAssignmentDto,
  ) {
    return this.commentAssignmentService.updateFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Patch('teacher')
  updateCommentOnAssignmentFromTeacher(
    @GetUser() user: User,
    @Body() dto: UpdateCommentOnAssignmentDto,
  ) {
    return this.commentAssignmentService.updateFromTeacher(dto, user);
  }

  @UseGuards(StudentGuard)
  @Delete(':commentOnAssignmentId/student')
  deleteCommentOnAssignmentFromStudent(
    @GetStudent() student: Student,
    @Param() dto: DeleteCommentAssignmentDto,
  ) {
    return this.commentAssignmentService.deleteFromStudent(dto, student);
  }

  @UseGuards(UserGuard)
  @Delete(':commentOnAssignmentId/teacher')
  deleteCommentOnAssignmentFromTeacher(
    @GetUser() user: User,
    @Param() dto: DeleteCommentAssignmentDto,
  ) {
    return this.commentAssignmentService.deleteFromTeacher(dto, user);
  }
}
