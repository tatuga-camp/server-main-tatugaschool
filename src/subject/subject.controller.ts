import { WheelOfNameService } from './../wheel-of-name/wheel-of-name.service';
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
import { StudentGuard, UserGuard } from '../auth/guard';
import { SubjectService } from './subject.service';
import {
  CreateSubjectDto,
  DeleteSubjectDto,
  GetSubjectByCode,
  GetSubjectByIdDto,
  GetSubjectByPageDto,
  ParamGetSubjectFromSchool,
  ParamSubjectThatStudentBelongto,
  QueryGetSubjectFromSchool,
  QuerySubjectThatStudentBelongto,
  ReorderSubjectsDto,
  UpdateSubjectDto,
  getAllSubjectsByTeamIdParam,
  getAllSubjectsByTeamIdQuery,
} from './dto';
import { GetStudent, GetUser } from '../auth/decorators';
import { Student, User } from '@prisma/client';

@Controller('v1/subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @UseGuards(UserGuard)
  @Get(':subjectId')
  async getSubjectById(@Param() dto: GetSubjectByIdDto, @GetUser() user: User) {
    return this.subjectService.getSubjectById(dto, user);
  }

  @UseGuards(StudentGuard)
  @Get('student/:subjectId')
  async getSubjectByIdFromStudnet(
    @Param() dto: GetSubjectByIdDto,
    @GetStudent() student: Student,
  ) {
    return this.subjectService.getSubjectWithTeacherAndStudent(dto);
  }

  @Get('code/:code')
  async getSubjectByCode(@Param() dto: GetSubjectByCode) {
    return this.subjectService.getSubjectWithTeacherAndStudent(dto);
  }

  @UseGuards(UserGuard)
  @Get('school/:schoolId')
  getSubjectFromSchool(
    @Param() param: ParamGetSubjectFromSchool,
    @Query() query: QueryGetSubjectFromSchool,
    @GetUser() user: User,
  ) {
    const dto = { ...param, ...query };
    return this.subjectService.getBySchoolId(dto, user);
  }

  @UseGuards(StudentGuard)
  @Get('student/:studentId')
  async getSubjectThatStudentBelongto(
    @Param() param: ParamSubjectThatStudentBelongto,
    @Query() query: QuerySubjectThatStudentBelongto,
    @GetStudent() student: Student,
  ) {
    const dto = { ...param, ...query };
    return this.subjectService.getSubjectsThatStudentBelongTo(dto, student);
  }

  @UseGuards(UserGuard)
  @Post()
  async createSubject(@Body() dto: CreateSubjectDto, @GetUser() user: User) {
    return this.subjectService.createSubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  async updateSubject(@Body() dto: UpdateSubjectDto, @GetUser() user: User) {
    return this.subjectService.updateSubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch('reorder')
  async reorderSubjects(
    @Body() dto: ReorderSubjectsDto,
    @GetUser() user: User,
  ) {
    return this.subjectService.reorderSubjects(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':subjectId')
  async deleteSubject(@Param() dto: DeleteSubjectDto, @GetUser() user: User) {
    return this.subjectService.deleteSubject(dto, user);
  }
}
