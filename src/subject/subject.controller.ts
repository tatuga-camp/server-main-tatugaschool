import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Student, User } from '@prisma/client';
import { GetStudent, GetUser } from '../auth/decorators';
import { StudentGuard, UserGuard } from '../auth/guard';
import {
  CreateSubjectDto,
  DeleteSubjectDto,
  DuplicateSubjectDto,
  GetSubjectByCode,
  GetSubjectByIdDto,
  ParamGetSubjectFromSchool,
  ParamSubjectThatStudentBelongto,
  QueryGetSubjectFromSchool,
  QuerySubjectThatStudentBelongto,
  ReorderSubjectsDto,
  UpdateSubjectDto,
} from './dto';
import { SubjectService } from './subject.service';
import { Response } from 'express';

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

  @Get(':subjectName/summary-report5/excel')
  async downloadSummaryReport5Excel(
    @Param('subjectName') subjectName: string,
    @Res() res: Response,
  ) {
    const buffer = await this.subjectService.generateSummaryReport5Excel();

    const filename = `ปพ5-${subjectName}.xlsx`;
    const encodedFilename = encodeURIComponent(filename);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
    });

    return res.send(buffer);
  }

  @UseGuards(UserGuard)
  @Post()
  async createSubject(@Body() dto: CreateSubjectDto, @GetUser() user: User) {
    return this.subjectService.createSubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Post('duplicate')
  async duplicateSubject(
    @Body() dto: DuplicateSubjectDto,
    @GetUser() user: User,
  ) {
    return this.subjectService.duplicateSubject(dto, user);
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
