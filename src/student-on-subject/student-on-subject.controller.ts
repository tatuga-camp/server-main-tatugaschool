import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentOnSubjectService } from './student-on-subject.service';
import { GetUser } from '../auth/decorators';
import {
  CreateStudentOnSubjectDto,
  DeleteStudentOnSubjectDto,
  GetStudentOnSubjectByIdDto,
  GetStudentOnSubjectByIdParamDto,
  GetStudentOnSubjectByIdQueryDto,
  GetStudentOnSubjectsByStudentIdDto,
  GetStudentOnSubjectsByStudentIdParamsDto,
  GetStudentOnSubjectsByStudentIdQueryDto,
  GetStudentOnSubjectsBySubjectIdDto,
} from './dto';
import { User } from '@prisma/client';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/student-on-subjects')
export class StudentOnSubjectController {
  constructor(private studentOnSubjectService: StudentOnSubjectService) {}

  @Get('subject/:subjectId')
  getStudentOnSubjectsBySubjectId(
    @Param() dto: GetStudentOnSubjectsBySubjectIdDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.getStudentOnSubjectsBySubjectId(
      dto,
      user,
    );
  }

  @Get('student/:studentId')
  getStudentOnSubjectByStudentId(
    @Param() params: GetStudentOnSubjectsByStudentIdParamsDto,
    @Query() query: GetStudentOnSubjectsByStudentIdQueryDto,
    @GetUser() user: User,
  ) {
    const dto = {
      params,
      query,
    };
    return this.studentOnSubjectService.getStudentOnSubjectsByStudentId(
      dto,
      user,
    );
  }

  @Get(':studentOnSubjectId')
  getStudentOnSubjectById(
    @Param() params: GetStudentOnSubjectByIdParamDto,
    @Query() query: GetStudentOnSubjectByIdQueryDto,
    @GetUser() user: User,
  ) {
    const dto = {
      params,
      query,
    };
    return this.studentOnSubjectService.getStudentOnSubjectById(dto, user);
  }

  @Post()
  createStudentOnSubject(
    @Body() dto: CreateStudentOnSubjectDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.createStudentOnSubject(dto, user);
  }

  @Delete(':studentOnSubjectId')
  deleteStudentOnSubject(
    @Param() dto: DeleteStudentOnSubjectDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.deleteStudentOnSubject(dto, user);
  }
}
