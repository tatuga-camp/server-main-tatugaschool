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

  // Task 9 adds GET /student-on-assignment/:id (teacher) and .../student (student) here.
}
