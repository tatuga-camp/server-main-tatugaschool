import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import { GradeService } from './grade.service';
import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateGradeDto, UpdateGradeDto } from './dto';
import { UserGuard } from '../auth/guard';

@Controller('v1/grades')
export class GradeController {
  constructor(private gradeService: GradeService) {}

  @UseGuards(UserGuard)
  @Post()
  create(@Body() dto: CreateGradeDto, @GetUser() user: User) {
    return this.gradeService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  update(@Body() dto: UpdateGradeDto, @GetUser() user: User) {
    return this.gradeService.update(
      {
        gradeRangeId: dto.query.gradeRangeId,
        gradeRange: dto.body.gradeRanges,
      },
      user,
    );
  }
}
