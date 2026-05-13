import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import {
  CreateTeacherOnSubjectDto,
  DeleteTeacherOnSubjectDto,
  GetTeacherOnSubjectByIdDto,
  GetTeacherOnSubjectsBySubjectIdDto,
  GetTeacherOnSubjectsByTeacherIdDto,
  UpdateTeacherOnSubjectDto,
} from './dto';
import { TeacherOnSubjectService } from './teacher-on-subject.service';
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
import { UserJwtPayload } from '../interfaces/jwt-payload';

@UseGuards(UserGuard)
@Controller('v1/teacher-on-subjects')
export class TeacherOnSubjectController {
  constructor(private teacherOnSubjectService: TeacherOnSubjectService) {}

  @Get(':teacherOnSubjectId')
  getTeacerOnSubjectById(
    @Param() dto: GetTeacherOnSubjectByIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.teacherOnSubjectService.getTeacherOnSubjectById(dto, user);
  }

  @Get('subject/:subjectId')
  getTeacherOnSubjectBySubjectId(
    @Param() dto: GetTeacherOnSubjectsBySubjectIdDto,

    @GetUser() user: UserJwtPayload,
  ) {
    return this.teacherOnSubjectService.getTeacherOnSubjectBySubjectId(
      dto,
      user,
    );
  }

  @Get('teacher/:teacherId')
  getTeacherOnSubjectByTeacherId(
    @Param() dto: GetTeacherOnSubjectsByTeacherIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.teacherOnSubjectService.getTeacherOnSubjectByUserId(dto, user);
  }

  @Post()
  createTeacherOnSubject(
    @Body() dto: CreateTeacherOnSubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.teacherOnSubjectService.createTeacherOnSubject(dto, user);
  }

  @Patch()
  updateTeacherOnSubject(
    @Body() dto: UpdateTeacherOnSubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.teacherOnSubjectService.updateTeacherOnSubject(dto, user);
  }

  @Delete(':teacherOnSubjectId')
  deleteTeacherOnSubject(
    @Param() dto: DeleteTeacherOnSubjectDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.teacherOnSubjectService.DeleteTeacherOnSubject(dto, user);
  }
}
