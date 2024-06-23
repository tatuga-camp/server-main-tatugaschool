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
import { UserGuard } from '../auth/guard';
import { SubjectService } from './subject.service';
import {
  CreateSubjectDto,
  DeleteSubjectDto,
  GetSubjectByIdDto,
  GetSubjectByPageDto,
  ReorderSubjectsDto,
  UpdateSubjectDto,
  getAllSubjectsByTeamIdParam,
  getAllSubjectsByTeamIdQuery,
} from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@UseGuards(UserGuard)
@Controller('v1/subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get(':subjectId')
  async getSubjectById(@Param() dto: GetSubjectByIdDto, @GetUser() user: User) {
    return this.subjectService.getSubjectById(dto, user);
  }

  @Get('team/:teamId')
  async getAllSubjectsByTeamId(
    @Param() param: getAllSubjectsByTeamIdParam,
    @Query() query: getAllSubjectsByTeamIdQuery,
    @GetUser() user: User,
  ) {
    const dto = { ...param, ...query };
    return this.subjectService.getAllSubjectsByTeamId(dto, user);
  }

  @Get()
  async getSubjectByPage(
    @Query() dto: GetSubjectByPageDto,
    @GetUser() user: User,
  ) {
    return this.subjectService.getSubjectByPage(dto, user);
  }

  @Post()
  async createSubject(@Body() dto: CreateSubjectDto, @GetUser() user: User) {
    return this.subjectService.createSubject(dto, user);
  }

  @Patch()
  async updateSubject(@Body() dto: UpdateSubjectDto, @GetUser() user: User) {
    return this.subjectService.updateSubject(dto, user);
  }

  @Patch('reorder')
  async reorderSubjects(
    @Body() dto: ReorderSubjectsDto,
    @GetUser() user: User,
  ) {
    return this.subjectService.reorderSubjects(dto, user);
  }

  @Delete(':subjectId')
  async deleteSubject(@Param() dto: DeleteSubjectDto, @GetUser() user: User) {
    return this.subjectService.deleteSubject(dto, user);
  }
}
