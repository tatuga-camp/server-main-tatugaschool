import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import {
  CreateStudentOnAssignmentDto,
  DeleteStudentOnAssignmentDto,
  GetStudentOnAssignmentByAssignmentIdDto,
  GetStudentOnAssignmentByStudentIdDto,
  UpdateStudentOnAssignmentDto,
} from './dto';
import { StudentOnAssignmentService } from './student-on-assignment.service';
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
@Controller('v1/student-on-assignments')
export class StudentOnAssignmentController {
  constructor(private studentOnAssignmentService: StudentOnAssignmentService) {}

  @Get('assignment/:assignmentId')
  getByAssignmentId(
    @Param() dto: GetStudentOnAssignmentByAssignmentIdDto,
    @GetUser() user: User,
  ) {
    return this.studentOnAssignmentService.getByAssignmentId(dto, user);
  }

  @Get('student/:studentId')
  getByStudentId(
    @Param() dto: GetStudentOnAssignmentByStudentIdDto,
    @GetUser() user: User,
  ) {
    return this.studentOnAssignmentService.getByStudentId(dto, user);
  }

  @Post()
  createStudentOnAssignment(
    @GetUser() user: User,
    @Body() dto: CreateStudentOnAssignmentDto,
  ) {
    return this.studentOnAssignmentService.create(dto, user);
  }

  @Patch()
  updateStudentOnAssignment(
    @GetUser() user: User,
    @Body() dto: UpdateStudentOnAssignmentDto,
  ) {
    return this.studentOnAssignmentService.update(dto, user);
  }

  @Delete(':studentOnAssignmentId')
  deleteStudentOnAssignment(
    @Param() dto: DeleteStudentOnAssignmentDto,
    @GetUser() user: User,
  ) {
    return this.studentOnAssignmentService.delete(dto, user);
  }
}
