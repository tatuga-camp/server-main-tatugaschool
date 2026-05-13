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
  UpdateverifyLineToken,
} from './dto';
import { SubjectService } from './subject.service';
import { StudentJwtPayload, UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @UseGuards(UserGuard)
  @Get(':subjectId')
  async getSubjectById(
    @Param() dto: GetSubjectByIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subjectService.getSubjectById(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch('/line/verify')
  async verifyLineToken(
    @Body() dto: UpdateverifyLineToken,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subjectService.verifyLineToken(
      {
        ...dto,
      },
      user,
    );
  }

  @UseGuards(StudentGuard)
  @Get('student/subject/:subjectId')
  async getSubjectByIdFromStudnet(
    @Param() dto: GetSubjectByIdDto,
    @GetStudent() student: StudentJwtPayload,
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
    @GetUser() user: UserJwtPayload,
  ) {
    const dto = { ...param, ...query };
    return this.subjectService.getBySchoolId(dto, user);
  }

  @UseGuards(StudentGuard)
  @Get('student/:studentId')
  async getSubjectThatStudentBelongto(
    @Param() param: ParamSubjectThatStudentBelongto,
    @Query() query: QuerySubjectThatStudentBelongto,
    @GetStudent() student: StudentJwtPayload,
  ) {
    const dto = { ...param, ...query };
    return this.subjectService.getSubjectsThatStudentBelongTo(dto, student);
  }

  @UseGuards(UserGuard)
  @Post()
  async createSubject(
    @Body() dto: CreateSubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subjectService.createSubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Post('duplicate')
  async duplicateSubject(
    @Body() dto: DuplicateSubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subjectService.duplicateSubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  async updateSubject(
    @Body() dto: UpdateSubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subjectService.updateSubject(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch('reorder')
  async reorderSubjects(
    @Body() dto: ReorderSubjectsDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subjectService.reorderSubjects(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':subjectId')
  async deleteSubject(
    @Param() dto: DeleteSubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.subjectService.deleteSubject(dto, user);
  }
}
