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
import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import {
  CreateStudentOnSubjectDto,
  DeleteStudentOnSubjectDto,
  GetStudentOnSubjectByIdDto,
  GetStudentOnSubjectsByStudentIdDto,
  GetStudentOnSubjectsBySubjectIdDto,
} from './dto';
import {
  SortDto,
  UpdateStudentOnSubjectDto,
} from './dto/patch-student-on-subject.dto';
import { StudentOnSubjectService } from './student-on-subject.service';

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

  @Get(':studentOnSubjectId/report')
  getStudentReport(
    @Param() dto: GetStudentOnSubjectByIdDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.getSummaryData(dto, user);
  }

  @Get('student/:studentId')
  getStudentOnSubjectByStudentId(
    @Param() dto: GetStudentOnSubjectsByStudentIdDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.getStudentOnSubjectsByStudentId(
      dto,
      user,
    );
  }

  @Get(':studentOnSubjectId')
  getStudentOnSubjectById(
    @Param() dto: GetStudentOnSubjectByIdDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.getStudentOnSubjectById(dto, user);
  }

  @Post()
  createStudentOnSubject(
    @Body() dto: CreateStudentOnSubjectDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.createStudentOnSubject(dto, user);
  }

  @Patch('sort')
  sortStudentOnSubject(@Body() dto: SortDto, @GetUser() user: User) {
    return this.studentOnSubjectService.sortStudentOnSubjects(dto, user);
  }

  @Patch()
  update(@Body() dto: UpdateStudentOnSubjectDto, @GetUser() user: User) {
    return this.studentOnSubjectService.update(dto, user);
  }

  @Delete(':studentOnSubjectId')
  deleteStudentOnSubject(
    @Param() dto: DeleteStudentOnSubjectDto,
    @GetUser() user: User,
  ) {
    return this.studentOnSubjectService.deleteStudentOnSubject(dto, user);
  }
}
