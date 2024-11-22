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
  ReorderAssignmentDto,
  UpdateAssignmentDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  async createAssignment(
    @Body() dto: CreateAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.createAssignment(dto, user);
  }

  @Get('subject/:subjectId')
  async getAssignments(
    @Param() dto: GetAssignmentBySubjectIdDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.getAssignmentBySubjectId(dto, user);
  }

  @Get(':assignmentId')
  async getAssignmentById(
    @Param() dto: GetAssignmentByIdDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.getAssignmentById(dto, user);
  }

  @Patch()
  async updateAssignment(
    @Body() dto: UpdateAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.updateAssignment(dto, user);
  }

  @Patch('reorder')
  async reorderAssignment(
    @Body() dto: ReorderAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.reorder(dto, user);
  }

  @Delete(':assignmentId')
  async deleteAssignment(
    @Param() dto: DeleteAssignmentDto,
    @GetUser() user: User,
  ) {
    return await this.assignmentService.deleteAssignment(dto, user);
  }
}
