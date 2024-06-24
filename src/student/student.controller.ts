import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { CreateManyStudentsDto } from './dto/create-many-students.dto';
import { GetStudentDto } from './dto/get-student.dto';
import { AuthGuard } from '../auth/auth.guard';
import { User } from '../auth/user.decorator';
import { User as UserEntity } from '@prisma/client';
import { GetUser } from 'src/auth/decorators';

@Controller('v1/students')
@UseGuards(AuthGuard)
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Get('class/:classId')
  async getAllStudentsInClass(
    @GetUser() user: User,
    @Param('classId') classId: string,
  ) {
    return this.studentService.getAllStudents(user, classId);
  }

  @Get(':id')
  // eslint-disable-next-line prettier/prettier
  async getStudentById(@GetUser() user: User, @Param() params: GetStudentDto) {
    return this.studentService.getStudentById(user, params.id);
  }

  @Post()
  async createStudent(
    @GetUser() user: User,
    @Body() createStudentDto: CreateStudentDto,
  ) {
    return this.studentService.createStudent(user, createStudentDto);
  }

  @Post('create-many')
  async createManyStudents(
    @Body() createManyStudentsDto: CreateManyStudentsDto,
    @Req() req: Request,
  ) {
    const userId = req.user.id;
    return this.studentService.createManyStudents(
      createManyStudentsDto,
      userId,
    );
  }
}
