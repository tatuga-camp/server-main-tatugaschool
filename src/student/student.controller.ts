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
import { Student, User } from '@prisma/client';
import { GetStudent, GetUser } from '../auth/decorators';
import { StudentGuard, UserGuard } from '../auth/guard';
import {
  CreateStudentDto,
  DeleteStudentDto,
  GetAllStudentsDto,
  GetStudentDto,
  UpdateStudentDto,
} from './dto';
import { StudentService } from './student.service';

@Controller('v1/students')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @UseGuards(UserGuard)
  @Get('class/:classId')
  async getAllStudentsInClass(
    @GetUser() user: User,
    @Param() dto: GetAllStudentsDto,
  ) {
    return this.studentService.getAllStudents(dto, user);
  }

  @UseGuards(StudentGuard)
  @Get('student/get-as-user')
  async studentGetStudentById(@GetStudent() student: Student) {
    return student;
  }

  @UseGuards(UserGuard)
  @Get(':studentId')
  async getStudentById(@GetUser() user: User, @Param() dto: GetStudentDto) {
    return this.studentService.getStudentById(dto, user);
  }

  @UseGuards(UserGuard)
  @Post()
  async createStudent(@GetUser() user: User, @Body() dto: CreateStudentDto) {
    return this.studentService.createStudent(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  async updateStudent(
    @GetUser() user: User,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentService.updateStudent(updateStudentDto, user);
  }

  @UseGuards(UserGuard)
  @Patch(':studentId/reset-password')
  async resetPassword(@GetUser() user: User, @Param() dto: GetStudentDto) {
    return this.studentService.resetStudnetPassword(dto, user);
  }

  @UseGuards(StudentGuard)
  @Patch('student')
  async studentUpdateStudent(
    @GetStudent() student: Student,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentService.updateStudent(
      updateStudentDto,
      undefined,
      student,
    );
  }

  @UseGuards(UserGuard)
  @Delete(':studentId')
  async deleteStudent(@Param() dto: DeleteStudentDto, @GetUser() user: User) {
    return this.studentService.deleteStudent(dto, user);
  }
}
