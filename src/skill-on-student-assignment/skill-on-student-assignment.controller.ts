import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkillOnStudentAssignmentService } from './skill-on-student-assignment.service';
import { UserGuard } from '../auth/guard';
import { CreateDto, DeleteDto, GetByStudentIdDto } from './dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/skill-on-student-assignments')
export class SkillOnStudentAssignmentController {
  constructor(
    private readonly skillOnStudentAssignmentService: SkillOnStudentAssignmentService,
  ) {}

  @UseGuards(UserGuard)
  @Get('student/:studentId')
  async getByStudentId(
    @Param() dto: GetByStudentIdDto,
    @GetUser() user: UserJwtPayload,
  ) {
    return this.skillOnStudentAssignmentService.getByStudentId(dto, user);
  }

  @UseGuards(UserGuard)
  @Post()
  async create(@Body() dto: CreateDto, @GetUser() user: UserJwtPayload) {
    return this.skillOnStudentAssignmentService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':id')
  async delete(@Param() dto: DeleteDto, @GetUser() user: UserJwtPayload) {
    return this.skillOnStudentAssignmentService.delete(dto, user);
  }
}
