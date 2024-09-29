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

@Controller('v1/skill-on-student-assignments')
export class SkillOnStudentAssignmentController {
  constructor(
    private readonly skillOnStudentAssignmentService: SkillOnStudentAssignmentService,
  ) {}

  @UseGuards(UserGuard)
  @Get('studnet/:studentId')
  async getByStudentId(@Param() dto: GetByStudentIdDto, @GetUser() user: User) {
    return this.skillOnStudentAssignmentService.getByStudentId(dto, user);
  }

  @Post()
  async create(@Body() dto: CreateDto, @GetUser() user: User) {
    return this.skillOnStudentAssignmentService.create(dto, user);
  }

  @Delete(':id')
  async delete(@Param() dto: DeleteDto, @GetUser() user: User) {
    return this.skillOnStudentAssignmentService.delete(dto, user);
  }
}
