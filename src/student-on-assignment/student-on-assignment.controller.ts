import { Student, User } from '@prisma/client';
import { GetStudent, GetUser } from '../auth/decorators';
import {
  CreateStudentOnAssignmentDto,
  DeleteStudentOnAssignmentDto,
  GetByIdDto,
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
import { StudentGuard, UserGuard } from '../auth/guard';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/student-on-assignments')
export class StudentOnAssignmentController {
  constructor(private studentOnAssignmentService: StudentOnAssignmentService) {}

  @UseGuards(StudentGuard)
  @Get(':id')
  getById(@Param() dto: GetByIdDto, @GetStudent() student: StudentJwtPayload) {
    return this.studentOnAssignmentService.getById(dto, student);
  }

  @UseGuards(UserGuard)
  @Get('assignment/:assignmentId')
  getByAssignmentId(
    @Param() dto: GetStudentOnAssignmentByAssignmentIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.studentOnAssignmentService.getByAssignmentId(dto, user);
  }

  @UseGuards(UserGuard)
  @Get('student/:studentId')
  getByStudentId(
    @Param() dto: GetStudentOnAssignmentByStudentIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.studentOnAssignmentService.getByStudentId(dto, user);
  }

  @UseGuards(UserGuard)
  @Post()
  createStudentOnAssignment(
    @GetUser() user: UserJwtPayload,
    @Body() dto: CreateStudentOnAssignmentDto,
  ) {
    return this.studentOnAssignmentService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  updateStudentOnAssignment(
    @GetUser() user: UserJwtPayload,
    @Body() dto: UpdateStudentOnAssignmentDto,
  ) {
    return this.studentOnAssignmentService.update(dto, user);
  }

  @UseGuards(StudentGuard)
  @Patch('student')
  studentUpdateStudentOnAssignment(
    @GetStudent() student: StudentJwtPayload,
    @Body() dto: UpdateStudentOnAssignmentDto,
  ) {
    return this.studentOnAssignmentService.update(dto, undefined, student);
  }

  @Delete(':studentOnAssignmentId')
  deleteStudentOnAssignment(
    @Param() dto: DeleteStudentOnAssignmentDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.studentOnAssignmentService.delete(dto, user);
  }
}
