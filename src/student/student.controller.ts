import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  Body,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import {
  CreateStudentDto,
  DeleteStudentDto,
  GetAllStudentsDto,
  GetStudentDto,
  UpdateStudentDto,
} from './dto';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/students')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Get('class/:classId')
  async getAllStudentsInClass(
    @GetUser() user: User,
    @Param() dto: GetAllStudentsDto,
  ) {
    return this.studentService.getAllStudents(dto, user);
  }

  @Get(':studentId')
  async getStudentById(@GetUser() user: User, @Param() dto: GetStudentDto) {
    return this.studentService.getStudentById(dto, user.id);
  }

  @Post()
  async createStudent(@GetUser() user: User, @Body() dto: CreateStudentDto) {
    return this.studentService.createStudent(dto, user);
  }

  @Patch()
  async updateStudent(
    @GetUser() user: User,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentService.updateStudent(updateStudentDto, user);
  }

  @Delete(':studentId')
  async deleteStudent(@Param() dto: DeleteStudentDto, @GetUser() user: User) {
    return this.studentService.deleteStudent(dto, user);
  }
}
