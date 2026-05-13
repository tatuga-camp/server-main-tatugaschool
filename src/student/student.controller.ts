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
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/students')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @UseGuards(UserGuard)
  @Get('class/:classId')
  async getAllStudentsInClass(
    @GetUser() user: UserJwtPayload,
    @Param() dto: GetAllStudentsDto,
  ) {
    return this.studentService.getAllStudents(dto, user);
  }

  @UseGuards(StudentGuard)
  @Get('student/get-as-user')
  async studentGetStudentById(@GetStudent() student: StudentJwtPayload) {
    return this.studentService.getStudentById(
      {
        studentId: student.id,
      },
      undefined,
      student,
    );
  }

  @UseGuards(UserGuard)
  @Get(':studentId')
  async getStudentById(
    @GetUser() user: UserJwtPayload,
    @Param() dto: GetStudentDto,
  ) {
    return this.studentService.getStudentById(dto, user);
  }
  user: UserJwtPayload;
  @UseGuards(UserGuard)
  @Post()
  async createStudent(
    @GetUser() user: UserJwtPayload,
    @Body() dto: CreateStudentDto,
  ) {
    return this.studentService.createStudent(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  async updateStudent(
    @GetUser() user: UserJwtPayload,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentService.updateStudent(updateStudentDto, user);
  }

  @UseGuards(UserGuard)
  @Patch(':studentId/reset-password')
  async resetPassword(
    @GetUser() user: UserJwtPayload,
    @Param() dto: GetStudentDto,
  ) {
    return this.studentService.resetStudnetPassword(dto, user);
  }

  @UseGuards(StudentGuard)
  @Patch('student')
  async studentUpdateStudent(
    @GetStudent() student: StudentJwtPayload,
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
  async deleteStudent(
    @Param() dto: DeleteStudentDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.studentService.deleteStudent(dto, user);
  }
}
