import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  GetAssignmentExportExcelDto,
  ReorderAssignmentDto,
  UpdateAssignmentDto,
} from './dto';
import { GetStudent, GetUser } from '../auth/decorators';
import { Student, User } from '@prisma/client';
import { StudentGuard, UserGuard } from '../auth/guard';

@Controller('v1/assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @UseGuards(UserGuard)
  @Get('export-excel')
  exportExcel(
    @Query() dto: GetAssignmentExportExcelDto,
    @GetUser() user: User,
  ) {
    return this.assignmentService.exportExcel(dto.subjectId, user);
  }

  @UseGuards(UserGuard)
  @Post()
  async createAssignment(
    @Body() dto: CreateAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.createAssignment(dto, user);
  }

  @UseGuards(UserGuard)
  @Get('subject/:subjectId')
  async getAssignments(
    @Param() dto: GetAssignmentBySubjectIdDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.getAssignmentBySubjectId(dto, user);
  }

  @UseGuards(UserGuard)
  @Get('subject/:subjectId/overview')
  async getAssignmentOverview(
    @Param() dto: GetAssignmentBySubjectIdDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.getOverviewScoreOnAssignment(dto, user);
  }

  @UseGuards(StudentGuard)
  @Get('student/subject/:subjectId')
  async studentGetAssignments(
    @Param() dto: GetAssignmentBySubjectIdDto,
    @GetStudent() student: Student,
  ) {
    return await this.assignmentService.getAssignmentBySubjectId(
      dto,
      undefined,
      student,
    );
  }

  @UseGuards(UserGuard)
  @Get(':assignmentId')
  async getAssignmentById(
    @Param() dto: GetAssignmentByIdDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.getAssignmentById(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  async updateAssignment(
    @Body() dto: UpdateAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.updateAssignment(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch('reorder')
  async reorderAssignment(
    @Body() dto: ReorderAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.reorder(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':assignmentId')
  async deleteAssignment(
    @Param() dto: DeleteAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.deleteAssignment(dto, user);
  }
}
