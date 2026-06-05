import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { UserGuard } from '../auth/guard';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { RubricService } from './rubric.service';
import { GradeRubricDto } from './dto';

@Controller('v1/rubric-scores')
export class RubricScoreController {
  constructor(private rubricService: RubricService) {}

  @UseGuards(UserGuard)
  @Put()
  grade(@Body() dto: GradeRubricDto, @GetUser() user: UserJwtPayload) {
    return this.rubricService.gradeStudent(dto, user);
  }

  // Task 9: read breakdown routes (teacher + student) to be added here.
  // @UseGuards(UserGuard)
  // @Get('student-on-assignment/:studentOnAssignmentId')
  // readForTeacher(
  //   @Param() dto: StudentOnAssignmentIdParamDto,
  //   @GetUser() user: UserJwtPayload,
  // ) {
  //   return this.rubricService.readBreakdownForTeacher(dto, user);
  // }
  //
  // @UseGuards(StudentGuard)
  // @Get('student-on-assignment/:studentOnAssignmentId/student')
  // readForStudent(
  //   @Param() dto: StudentOnAssignmentIdParamDto,
  //   @GetStudent() student: StudentJwtPayload,
  // ) {
  //   return this.rubricService.readBreakdownForStudent(dto, student);
  // }
}
