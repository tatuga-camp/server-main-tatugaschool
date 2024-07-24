import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import {
  CreateAssignmentDto,
  DeleteAssignmentDto,
  GetAssignmentByIdDto,
  GetAssignmentBySubjectIdDto,
  UpdateAssignmentDto,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@Controller('v1/assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  async createAssignment(
    @Body() dto: CreateAssignmentDto,
    @GetUser() user: User,
  ) {
    return this.assignmentService.createAssignment(dto, user);
  }

  @Get('subject/:subjectId')
  async getAssignments(
    @Param() dto: GetAssignmentBySubjectIdDto,
    @GetUser() user: User,
  ) {
    return this.assignmentService.getAssignmentBySubjectId(dto, user);
  }

  @Get(':assignmentId')
  async getAssignmentById(
    @Param() dto: GetAssignmentByIdDto,
    @GetUser() user: User,
  ) {
    return this.assignmentService.getAssignmentById(dto, user);
  }

  @Patch()
  async updateAssignment(
    @Body() dto: UpdateAssignmentDto,
    @GetUser() user: User,
  ) {
    return this.assignmentService.updateAssignment(dto, user);
  }

  @Delete(':assignmentId')
  async deleteAssignment(
    @Param() dto: DeleteAssignmentDto,
    @GetUser() user: User,
  ) {
    return this.assignmentService.deleteAssignment(dto, user);
  }
}
